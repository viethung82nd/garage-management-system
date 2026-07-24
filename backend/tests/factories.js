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

/**
 * Returns a "YYYY-MM-DD" date string `daysFromNow` days ahead of today
 * (defaults to ~1 year out). Booking/reception tests need a date that is
 * always in the future relative to whenever the suite runs; a hardcoded
 * literal (e.g. "2027-01-15") eventually lapses into the past and the
 * "rejects a past date" validation starts failing the test for the wrong
 * reason. Computing it relative to `Date.now()` keeps the suite green.
 */
export function futureDateStr(daysFromNow = 365) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
