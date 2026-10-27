import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Readable } from "stream";
import sharp, { type Metadata } from "sharp";
import { Upload } from "@aws-sdk/lib-storage";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Request, Response } from "express";
import { s3Client, BUCKET_NAME } from "../Config/S3Service";
import { env } from "../Config/env";

export const IMAGE_MIME_TYPES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
};

// Every upload is re-encoded to these widths (webp); the largest is the canonical URL stored in content
export const IMAGE_WIDTHS = [400, 800, 1600] as const;
const MAX_INPUT_PIXELS = 50_000_000; // guards against decompression bombs

const uploadRoot = path.resolve(env.UPLOAD_DIR);
const KEY_PATTERN = /^[a-zA-Z0-9/_.-]+$/;

export class UploadTooLargeError extends Error {}
export class InvalidImageError extends Error {}

export const mediaUrl = (key: string) => `${env.PUBLIC_API_URL}/media/${key}`;

async function readLimited(stream: Readable, limit: number): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of stream) {
        total += chunk.length;
        if (total > limit) {
            stream.destroy();
            throw new UploadTooLargeError(`Image is larger than ${env.MAX_UPLOAD_MB} MB`);
        }
        chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
}

async function putObject(key: string, body: Buffer, contentType: string) {
    if (env.STORAGE_DRIVER === "s3") {
        await new Upload({ client: s3Client, params: { Bucket: BUCKET_NAME, Key: key, Body: body, ContentType: contentType } }).done();
        return;
    }
    const filePath = path.join(uploadRoot, key);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, body);
}

export interface StoredImage {
    key: string; // key of the largest variant
    url: string;
    width: number;
    height: number;
    bytes: number; // original upload size
    variants: { width: number; url: string }[];
}

// Validates, auto-rotates, strips metadata (EXIF/GPS) and stores 400/800/1600px webp variants
export async function storeImage(stream: Readable, userUuid: string): Promise<StoredImage> {
    const input = await readLimited(stream, env.MAX_UPLOAD_MB * 1024 * 1024);

    let meta: Metadata;
    try {
        meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    } catch {
        throw new InvalidImageError("This file isn't a valid image");
    }
    if (!meta.format || !["jpeg", "png", "webp", "gif"].includes(meta.format)) {
        throw new InvalidImageError("Only JPG, PNG, WEBP or GIF images are allowed");
    }

    const animated = meta.format === "gif" && (meta.pages ?? 1) > 1;
    const base = `users/${userUuid}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;

    const outputs = await Promise.all(IMAGE_WIDTHS.map(async (width) => {
        const { data, info } = await sharp(input, { animated, limitInputPixels: MAX_INPUT_PIXELS })
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: width <= 400 ? 76 : 82, effort: 4 })
            .toBuffer({ resolveWithObject: true });
        const key = `${base}-w${width}.webp`;
        await putObject(key, data, "image/webp");
        return { width, key, info };
    }));

    const largest = outputs[outputs.length - 1];
    return {
        key: largest.key,
        url: mediaUrl(largest.key),
        width: largest.info.width,
        height: animated ? largest.info.pageHeight ?? largest.info.height : largest.info.height,
        bytes: input.length,
        variants: outputs.map((o) => ({ width: o.width, url: mediaUrl(o.key) })),
    };
}

// ─── Private documents (e.g. driver licences): never served by /media, only through signed, expiring links ───

const PRIVATE_PREFIX = "private/";
const PRIVATE_WIDTH = 1400;

// Validates, auto-rotates, strips EXIF/GPS and stores one webp under private/<folder>/; returns the storage key
export async function storePrivateImage(stream: Readable, folder: string): Promise<string> {
    const input = await readLimited(stream, env.MAX_UPLOAD_MB * 1024 * 1024);
    let meta: Metadata;
    try {
        meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    } catch {
        throw new InvalidImageError("This file isn't a valid image");
    }
    if (!meta.format || !["jpeg", "png", "webp", "heif"].includes(meta.format)) {
        throw new InvalidImageError("Only JPG, PNG or WEBP photos are allowed");
    }
    const data = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .resize({ width: PRIVATE_WIDTH, height: PRIVATE_WIDTH, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    const key = `${PRIVATE_PREFIX}${folder}/${Date.now()}-${crypto.randomBytes(12).toString("hex")}.webp`;
    await putObject(key, data, "image/webp");
    return key;
}

export async function deletePrivateImage(key: string | null | undefined) {
    if (!key || !key.startsWith(PRIVATE_PREFIX) || !KEY_PATTERN.test(key) || key.includes("..")) return;
    try {
        if (env.STORAGE_DRIVER === "s3") {
            await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
        } else {
            await fs.promises.unlink(path.join(uploadRoot, key));
        }
    } catch {
        // already gone
    }
}

const sign = (key: string, exp: number) => crypto.createHmac("sha256", env.JWT_SECRET).update(`${key}|${exp}`).digest("hex");

// Link valid for ttlSeconds, handed only to the signed-in owner
export function signedPrivateUrl(key: string | null | undefined, ttlSeconds = 3600): string | null {
    if (!key) return null;
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    return `${env.PUBLIC_API_URL}/private-media/${key.slice(PRIVATE_PREFIX.length)}?exp=${exp}&sig=${sign(key, exp)}`;
}

// GET /private-media/<rest>?exp=&sig=
export async function servePrivateMedia(req: Request, res: Response) {
    const rest = (req.params as any)[0] as string;
    const key = `${PRIVATE_PREFIX}${rest}`;
    const exp = Number(req.query.exp);
    const sig = String(req.query.sig ?? "");
    if (!rest || !KEY_PATTERN.test(rest) || rest.includes("..") || !key.endsWith(".webp")) return res.status(400).end();
    const expected = sign(key, exp);
    if (!Number.isFinite(exp) || exp < Date.now() / 1000 || sig.length !== expected.length
        || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return res.status(403).end();
    }
    res.setHeader("Cache-Control", "private, max-age=600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Referrer-Policy", "no-referrer");
    try {
        if (env.STORAGE_DRIVER === "s3") {
            const object = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
            res.setHeader("Content-Type", "image/webp");
            (object.Body as Readable).pipe(res);
        } else {
            const filePath = path.join(uploadRoot, key);
            if (!filePath.startsWith(uploadRoot + path.sep)) return res.status(400).end();
            res.type("image/webp").sendFile(filePath, (err) => err && !res.headersSent && res.status(404).end());
        }
    } catch {
        if (!res.headersSent) res.status(404).end();
    }
}

// GET /media/<key> — streams a stored file from local disk or S3
export async function serveMedia(req: Request, res: Response) {
    const key = (req.params as any)[0] as string;
    if (!key || !KEY_PATTERN.test(key) || key.includes("..")) return res.status(400).end();
    // Private documents are only reachable through signed /private-media links
    if (key.startsWith(PRIVATE_PREFIX)) return res.status(404).end();

    const ext = path.extname(key).slice(1).toLowerCase();
    const contentType = Object.entries(IMAGE_MIME_TYPES).find(([, e]) => e === ext)?.[0];
    if (!contentType) return res.status(404).end();

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    try {
        if (env.STORAGE_DRIVER === "s3") {
            const object = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
            res.setHeader("Content-Type", contentType);
            (object.Body as Readable).pipe(res);
        } else {
            const filePath = path.join(uploadRoot, key);
            if (!filePath.startsWith(uploadRoot + path.sep)) return res.status(400).end();
            res.type(contentType).sendFile(filePath, (err) => err && !res.headersSent && res.status(404).end());
        }
    } catch {
        if (!res.headersSent) res.status(404).end();
    }
}
