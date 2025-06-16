import cloudinary from "./cloudinary"

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
            if (error) return reject(error);
            resolve();
        });
    });
}