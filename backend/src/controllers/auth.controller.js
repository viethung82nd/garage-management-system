import { UserModel } from "../models/index.js";
import { HttpError } from "../middleware/error.js";
import { signAccessToken } from "../utils/jwt.js";
import { hashPassword, comparePassword } from "../utils/password.js";

/**
 * Roles that can hold a password and log in. `walkInCustomer` is excluded on
 * purpose: walk-in customers have no account and use lookup codes instead.
 */
export const LOGIN_ROLES = [
  "onlineCustomer",
  "serviceAdvisor",
  "technician",
  "accountant",
  "admin",
];

/** Staff roles an admin is allowed to create via POST /api/auth/staff. */
const STAFF_ROLES = ["serviceAdvisor", "technician", "accountant", "admin"];

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function validateCredentials({ fullName, email, password }) {
  if (!fullName || !fullName.trim()) {
    throw new HttpError(400, "fullName is required");
  }
  if (!email || !EMAIL_RE.test(email)) {
    throw new HttpError(400, "A valid email is required");
  }
  if (!password || password.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters");
  }
}

function toAuthResponse(user) {
  const token = signAccessToken({ sub: user._id.toString(), role: user.role });
  return { token, user };
}

/** POST /api/auth/register — public sign-up, always an online customer. */
export async function register(req, res) {
  const { fullName, email, phone, password } = req.body ?? {};
  validateCredentials({ fullName, email, password });

  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new HttpError(409, "Email is already registered");
  }

  const user = await UserModel.create({
    fullName,
    email,
    phone,
    passwordHash: await hashPassword(password),
    role: "onlineCustomer",
    accountType: "registered",
  });

  res.status(201).json(toAuthResponse(user));
}

/** POST /api/auth/login — email + password for any of the 5 login roles. */
export async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    throw new HttpError(400, "email and password are required");
  }

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  // Same message for unknown email and wrong password — no account probing.
  if (!user || !user.passwordHash || !LOGIN_ROLES.includes(user.role)) {
    throw new HttpError(401, "Invalid email or password");
  }
  if (!(await comparePassword(password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email or password");
  }
  if (!user.isActive) {
    throw new HttpError(403, "Account is deactivated");
  }

  res.json(toAuthResponse(user));
}

/** GET /api/auth/me — profile of the authenticated user. */
export async function me(req, res) {
  const user = await UserModel.findById(req.user.sub);
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  res.json({ user });
}

/** POST /api/auth/staff — admin creates staff accounts (advisor/tech/accountant/admin). */
export async function createStaff(req, res) {
  const { fullName, email, phone, password, role } = req.body ?? {};
  validateCredentials({ fullName, email, password });
  if (!STAFF_ROLES.includes(role)) {
    throw new HttpError(400, `role must be one of: ${STAFF_ROLES.join(", ")}`);
  }

  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new HttpError(409, "Email is already registered");
  }

  const user = await UserModel.create({
    fullName,
    email,
    phone,
    passwordHash: await hashPassword(password),
    role,
    accountType: "registered",
    createdBy: req.user.sub,
  });

  res.status(201).json({ user });
}
