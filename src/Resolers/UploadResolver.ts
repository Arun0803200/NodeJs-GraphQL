import { Resolver, Mutation, Arg } from "type-graphql";
import { GraphQLUpload } from "graphql-upload-ts";
import { Upload } from "@aws-sdk/lib-storage"; // Use this for streams
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { s3Client, BUCKET_NAME } from "../Config/S3Service";
import { DeleteFileResponse, FileResponse } from "../Config/SettingsTypes";
import { UserImages } from "../Entity/UserImages";
import { User } from "../Entity/User";
import { AppDataSource } from '../Config/DataSource';

const userService = AppDataSource.getRepository(User);

type FileUpload = {
  filename: string;
  mimetype: string;
  encoding: string;
  uuid: string;
  createReadStream: () => NodeJS.ReadableStream;
};

@Resolver()
export class UploadResolver {

  @Mutation(() => FileResponse)
  async uploadFile(
    @Arg("file", () => GraphQLUpload) file: FileUpload,
    @Arg("uuid") uuid: string,
  ): Promise<FileResponse> {
    const { createReadStream, filename, mimetype } = file;

    const stream = createReadStream() as unknown as Readable;
    const key = `uploads/${Date.now()}-${filename}`;

    try {

      const findUser = await userService.findOne({ where: { userUuid: uuid }, select: ['id'] });
      if (!findUser) {
        return {
          status: 0,
          message: 'UUID not found',
        };
      }

      let totalSize = 0;

      // Track size BEFORE passing to S3 by wrapping the stream
      const { PassThrough } = await import("stream");
      const passThroughStream = new PassThrough();

      stream.on("data", (chunk) => {
        totalSize += chunk.length; // Captured during actual upload
      });

      stream.pipe(passThroughStream);

      const parallelUploads3 = new Upload({
        client: s3Client,
        params: {
          Bucket: BUCKET_NAME,
          Key: key,
          Body: passThroughStream, // Use passthrough, not raw stream
          ContentType: mimetype,
        },
      });

      await parallelUploads3.done(); // totalSize is now fully accumulated

      const imageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      const newUserImages = new UserImages();
      newUserImages.userUuid = uuid;
      newUserImages.imageOriginalName = filename;
      newUserImages.imageMimeType = mimetype;
      const sizeInKB = parseFloat((totalSize / 1024).toFixed(2));
      newUserImages.imageSize = sizeInKB;
      newUserImages.imageFilename = key;
      newUserImages.imagePath = key;
      newUserImages.imageUrl = imageUrl;
      newUserImages.createdAt = new Date();
      newUserImages.updatedAt = new Date();

      const userImagesRepo = AppDataSource.getRepository(UserImages);
      await userImagesRepo.save(newUserImages);

      return {
        status: 1,
        message: 'File uploaded successfully!',
        url: imageUrl,
      };
    } catch (error) {
      console.error("S3 Upload Error:", error);
      throw new Error("Failed to upload file to S3");
    }
  }

  @Mutation(() => DeleteFileResponse)
  async deleteFile(
    @Arg("key") key: string // Example: "uploads/1700000000-myfile.jpg"
  ): Promise<DeleteFileResponse> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
      return {
        status: 1,
        message: 'File deleted successfully!',
      };
    } catch (error) {
      console.error("S3 Delete Error:", error);
      // Even if the file doesn't exist, S3 often returns success (204). 
      // Errors usually mean network or permission issues.
      throw new Error("Failed to delete file from S3");
    }
  }
}
