import cloudinary from "./cloudinary";
import { Readable } from "stream";

export const uploadToCloudinary = async (
  buffer: Buffer,
  filename: string,
  publicId?: string
): Promise<{ imageUrl: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "lodges",
        public_id: publicId || filename,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        else
          resolve({
            imageUrl: result!.secure_url,
            publicId: result!.public_id,
          });
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
};
