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
  // The one canonical public URL for the deployed frontend — used to build
  // links/assets (email CTA buttons, the logo image) that a real customer's
  // inbox has to be able to reach. Deliberately NOT derived from corsOrigin:
  // that list's first entry is whatever a dev happened to put first (often
  // localhost, which is exactly what silently broke every email link and
  // the logo before this existed — see utils/emailTemplate.js).
  publicSiteUrl: optional("PUBLIC_SITE_URL", "https://garage-management-system-fe.onrender.com"),
  // Optional (not required()) so the server still boots for anyone who
  // hasn't set up Cloudinary yet — only the upload endpoints need this, not
  // the whole app. They fail with a clear error instead if it's missing.
  cloudinary: {
    cloudName: optional("CLOUDINARY_CLOUD_NAME", ""),
    apiKey: optional("CLOUDINARY_API_KEY", ""),
    apiSecret: optional("CLOUDINARY_API_SECRET", ""),
  },
};
