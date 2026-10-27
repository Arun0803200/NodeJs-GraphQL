const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/graphql";

export const MAX_UPLOAD_MB = 10;
export const MAX_FILES_PER_REQUEST = 10;
export const ACCEPTED_IMAGES = "image/jpeg,image/png,image/webp,image/gif";

export interface UploadedImage {
  id: number;
  fileName: string;
  url: string; // largest variant — store this in content
  width: number;
  height: number;
  srcSet: string;
}

export interface UploadResult {
  fileName: string;
  status: number;
  message: string;
  data: UploadedImage | null;
}

const IMAGE_FIELDS = "id fileName url width height srcSet";

function validate(file: File) {
  if (!ACCEPTED_IMAGES.split(",").includes(file.type)) throw new Error("Only JPG, PNG, WEBP or GIF images are allowed");
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`Image must be under ${MAX_UPLOAD_MB} MB`);
}

// GraphQL multipart request (https://github.com/jaydenseric/graphql-multipart-request-spec)
export async function postMultipart(query: string, variables: Record<string, unknown>, files: Record<string, File>, map: Record<string, string[]>) {
  const body = new FormData();
  body.append("operations", JSON.stringify({ query, variables }));
  body.append("map", JSON.stringify(map));
  Object.entries(files).forEach(([key, file]) => body.append(key, file));

  const token = localStorage.getItem("token");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Apollo-Require-Preflight": "true", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body,
  });
  const json = await res.json();
  if (json?.errors?.length) throw new Error(json.errors[0].message || "Upload failed");
  return json.data;
}

// Single image; resolves to the URL to store in content
export async function uploadImage(file: File): Promise<string> {
  validate(file);
  const data = await postMultipart(
    `mutation UploadMyImage($file: Upload!) { uploadMyImage(file: $file) { status message data { ${IMAGE_FIELDS} } } }`,
    { file: null }, { 0: file }, { 0: ["variables.file"] });
  const result = data?.uploadMyImage;
  if (!result || result.status !== 1 || !result.data) throw new Error(result?.message || "Upload failed");
  return result.data.url;
}

// Several images in one request (max MAX_FILES_PER_REQUEST); one result per file, in order
export async function uploadImages(files: File[]): Promise<UploadResult[]> {
  const results: (UploadResult | null)[] = files.map(() => null);
  const valid: { file: File; index: number }[] = [];
  files.forEach((file, index) => {
    try {
      validate(file);
      valid.push({ file, index });
    } catch (err: any) {
      results[index] = { fileName: file.name, status: 0, message: err.message, data: null };
    }
  });

  if (valid.length) {
    const map: Record<string, string[]> = {};
    const parts: Record<string, File> = {};
    valid.forEach(({ file }, i) => { map[i] = [`variables.files.${i}`]; parts[i] = file; });
    const data = await postMultipart(
      `mutation UploadMyImages($files: [Upload!]!) { uploadMyImages(files: $files) { status message uploaded failed results { fileName status message data { ${IMAGE_FIELDS} } } } }`,
      { files: valid.map(() => null) }, parts, map);
    const serverResults: UploadResult[] = data?.uploadMyImages?.results ?? [];
    if (!serverResults.length) throw new Error(data?.uploadMyImages?.message || "Upload failed");
    valid.forEach(({ index }, i) => { results[index] = serverResults[i]; });
  }
  return results as UploadResult[];
}
