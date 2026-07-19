import multer from "multer";

/**
 * Shared in-memory image upload handler. Buffers stay in memory — controllers
 * upload straight to Cloudinary, so this doesn't depend on a persistent local
 * filesystem. Used for every photo upload in the app (service category
 * photos, inspection photos, etc).
 */
export function imageUpload({ maxSizeMb = 5 } = {}) {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter(_req, file, cb) {
      if (!file.mimetype.startsWith("image/")) {
        cb(new Error("Only image files are allowed"), false);
        return;
      }
      cb(null, true);
    },
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
  });
}
