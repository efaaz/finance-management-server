import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;

    const response = await cloudinary.uploader.destroy(publicId);

    console.log("File deleted successfully");
    return response;
  } catch (error) {
    console.log(error);
    return null;
  }
};
// for ordinary server 
// const uploadToCloudinary = async (filePath) => {
//   try {
//     if (!filePath) return null;

//     const response = await cloudinary.uploader.upload(filePath, {
//       resource_type: "auto",
//     });

//     // console.log("File uploaded successfully", response.url);
//     fs.unlinkSync(filePath);
//     return response;
//   } catch (error) {
//     fs.unlinkSync(filePath);
//     console.log(error);
//     return null;
//   }
// };

// for vercel deployment

const uploadToCloudinary = async (buffer) => {
  try {
    if (!buffer) return null;

    const response = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: "finx/avatars",
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        },
      );

      uploadStream.end(buffer);
    });

    return response;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return null;
  }
};

export { uploadToCloudinary, deleteFromCloudinary };
