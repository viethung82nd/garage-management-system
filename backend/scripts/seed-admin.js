/**
 * Creates the first admin account so staff accounts can be created via the API.
 * Usage: node scripts/seed-admin.js <email> <password> [fullName]
 */
import { connectDb } from "../src/db/connect.js";
import { UserModel } from "../src/models/index.js";
import { hashPassword } from "../src/utils/password.js";
import mongoose from "mongoose";

const [email, password, fullName = "Administrator"] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: node scripts/seed-admin.js <email> <password> [fullName]");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters");
  process.exit(1);
}

await connectDb();

const existing = await UserModel.findOne({ email: email.toLowerCase() });
if (existing) {
  console.error(`A user with email ${email} already exists (role: ${existing.role})`);
  await mongoose.disconnect();
  process.exit(1);
}

const admin = await UserModel.create({
  fullName,
  email,
  passwordHash: await hashPassword(password),
  role: "admin",
  accountType: "registered",
});

console.log(`Admin created: ${admin.email} (${admin._id})`);
await mongoose.disconnect();
