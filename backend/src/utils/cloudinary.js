import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/error.js";

const isConfigured = Boolean(
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret,
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

/**
 * Uploads an in-memory file buffer (from multer's memoryStorage) to
 * Cloudinary and returns its public HTTPS URL. Used for every photo upload
 * in the app — inspection photos, service category photos — instead of
 * writing to local disk, which doesn't survive a redeploy on most hosts.
 */
export function uploadBufferToCloudinary(buffer, folder) {
  if (!isConfigured) {
    throw new HttpError(
      500,
      "Photo upload is not configured: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET",
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}
