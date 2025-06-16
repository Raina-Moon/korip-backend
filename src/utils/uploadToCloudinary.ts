import cloudinary from "./cloudinary";

export const uploadToCloudinary = async (
  buffer: Buffer,
  filename: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "lodges",
        public_id: filename,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        else resolve(result!.secure_url);
      }
    );
    stream.end(buffer);
  });
};
