import { Resolver, Mutation, Arg, Authorized, Ctx } from "type-graphql";
import { GraphQLUpload } from "graphql-upload-ts";
import { Readable } from "stream";
import { AppDataSource } from "../../Config/DataSource";
import { UserImages } from "../../Entity/UserImages";
import { AppContext } from "../../Middleware/authChecker";
import { InvalidImageError, storeImage, UploadTooLargeError } from "../../Utils/storage";
import { ImageUploadResponse, ImageUploadResult, MultiImageUploadResponse, UploadedImage } from "../../Responses/MediaResponses";
import { env } from "../../Config/env";

const userImagesRepo = AppDataSource.getRepository(UserImages);

const MAX_FILES_PER_REQUEST = 10;

type FileUpload = {
    filename: string;
    mimetype: string;
    createReadStream: () => NodeJS.ReadableStream;
};

async function processUpload(filePromise: Promise<FileUpload> | FileUpload, userUuid: string): Promise<ImageUploadResult> {
    let fileName = "image";
    try {
        const { filename, createReadStream } = await filePromise;
        fileName = filename;
        const stored = await storeImage(createReadStream() as unknown as Readable, userUuid);

        const record = new UserImages();
        record.userUuid = userUuid;
        record.imageOriginalName = filename.slice(0, 255);
        record.imageMimeType = "image/webp";
        record.imageSize = parseFloat((stored.bytes / 1024).toFixed(2));
        record.imageFilename = stored.key;
        record.imagePath = stored.key;
        record.imageUrl = stored.url;
        record.width = stored.width;
        record.height = stored.height;
        record.variants = stored.variants;
        record.createdAt = new Date();
        record.updatedAt = new Date();
        const saved = await userImagesRepo.save(record);

        const data: UploadedImage = {
            id: saved.id,
            fileName: filename,
            url: stored.url,
            width: stored.width,
            height: stored.height,
            variants: stored.variants,
            srcSet: stored.variants.map((v) => `${v.url} ${v.width}w`).join(", "),
        };
        return { fileName, status: 1, message: "Uploaded", data };
    } catch (error: any) {
        if (error instanceof UploadTooLargeError || error instanceof InvalidImageError) {
            return { fileName, status: 0, message: error.message, data: null };
        }
        console.error("Upload Error:", error);
        return { fileName, status: 0, message: `Upload failed. Images must be JPG, PNG, WEBP or GIF under ${env.MAX_UPLOAD_MB} MB.`, data: null };
    }
}

@Resolver()
export class MediaResolver {

    // One image (profile photo, cover, certificate, project screenshot)
    @Authorized("user", "admin")
    @Mutation(() => ImageUploadResponse)
    async uploadMyImage(
        @Ctx() ctx: AppContext,
        @Arg("file", () => GraphQLUpload) file: Promise<FileUpload> | FileUpload,
    ): Promise<ImageUploadResponse> {
        const result = await processUpload(file, ctx.user!.userUuid);
        return { status: result.status, message: result.message, url: result.data?.url, data: result.data };
    }

    // Several images at once (album). Files are processed one by one; each gets its own result.
    @Authorized("user", "admin")
    @Mutation(() => MultiImageUploadResponse)
    async uploadMyImages(
        @Ctx() ctx: AppContext,
        @Arg("files", () => [GraphQLUpload]) files: (Promise<FileUpload> | FileUpload)[],
    ): Promise<MultiImageUploadResponse> {
        if (files.length === 0) return { status: 0, message: "No files received", uploaded: 0, failed: 0, results: [] };
        if (files.length > MAX_FILES_PER_REQUEST) {
            return { status: 0, message: `Upload at most ${MAX_FILES_PER_REQUEST} images at a time`, uploaded: 0, failed: files.length, results: [] };
        }

        const results: ImageUploadResult[] = [];
        for (const file of files) {
            results.push(await processUpload(file, ctx.user!.userUuid));
        }
        const uploaded = results.filter((r) => r.status === 1).length;
        const failed = results.length - uploaded;
        return {
            status: failed === 0 ? 1 : 0,
            message: failed === 0 ? `${uploaded} image(s) uploaded` : `${uploaded} uploaded, ${failed} failed`,
            uploaded,
            failed,
            results,
        };
    }
}
