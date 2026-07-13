import dotenv from "dotenv";

dotenv.config();

/**
 * Reads a required environment variable, crashing immediately with a clear
 * message if it is missing. Fail-fast beats a silent failure deep in a request.
 */
function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "4000")),
  mongoUri: required("MONGODB_URI"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: optional("JWT_EXPIRES_IN", "7d"),
  corsOrigin: optional("CORS_ORIGIN", "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  // Optional (not required()) so the server still boots for anyone who
  // hasn't set up Cloudinary yet — only the upload endpoints need this, not
  // the whole app. They fail with a clear error instead if it's missing.
  cloudinary: {
    cloudName: optional("CLOUDINARY_CLOUD_NAME", ""),
    apiKey: optional("CLOUDINARY_API_KEY", ""),
    apiSecret: optional("CLOUDINARY_API_SECRET", ""),
  },
};
