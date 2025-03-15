import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
      if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto",
        });
        // console.log('file uploaded successfully', response.url);
        fs.unlinkSync(localFilePath); // delete the file locally after uploading on cloudinary
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); // delete the file locally if it fails to upload on cloudinary
        console.log(error);
        return null;
    }
}

const deleteFromCloudinary = async (publicUrl) => {
  try {
      if (!publicUrl) return null;
      
      // Extract the public_id from the Cloudinary URL
      // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/public_id.extension
      const urlParts = publicUrl.split('/');
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      const publicId = publicIdWithExtension.split('.')[0];
      
      // Delete the image from Cloudinary
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
  } catch (error) {
      console.log("Error deleting image from Cloudinary:", error);
      return null;
  }
} 

export { uploadOnCloudinary, deleteFromCloudinary };