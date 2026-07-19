import { UserModel } from "../src/models/index.js";
import { signAccessToken } from "../src/utils/jwt.js";
import { hashPassword } from "../src/utils/password.js";

let counter = 0;
function unique() {
  counter += 1;
  return `${Date.now()}${counter}`;
}

export async function createUser(overrides = {}) {
  const id = unique();
  const password = overrides.password || "password123";
  const user = await UserModel.create({
    fullName: overrides.fullName ?? `Test User ${id}`,
    email: overrides.email ?? `user${id}@example.com`,
    phone: overrides.phone ?? `09${id}`.slice(0, 10),
    passwordHash: await hashPassword(password),
    role: overrides.role ?? "onlineCustomer",
    accountType: overrides.accountType ?? "registered",
    isActive: overrides.isActive ?? true,
    isEmailVerified: overrides.isEmailVerified ?? true,
  });
  return { user, password };
}

export function tokenFor(user) {
  return signAccessToken({ sub: user._id.toString(), role: user.role });
}

export function authHeader(user) {
  return { Authorization: `Bearer ${tokenFor(user)}` };
}
