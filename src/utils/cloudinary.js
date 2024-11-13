import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: "djcyuefew",
  api_key: "394889569744328",
  api_secret: "uWrY1d5PnATt44vfZQ_qZuWwiRM",
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    //file upload on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    //file has been uploaded on cloudinary
    console.log("File has been uploaded on cloudinary ", response.url);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the local saved temporary file as the upload operation get failed as what we will do with the currupted file
    return null;
  }
};

export { uploadOnCloudinary };
