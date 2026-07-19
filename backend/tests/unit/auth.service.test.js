import { describe, it, expect } from "vitest";
import * as authService from "../../src/services/auth.service.js";
import { UserModel, OtpModel } from "../../src/models/index.js";
import { ApiError } from "../../src/utils/apiError.js";
import { createUser } from "../factories.js";

describe("auth.service", () => {
  describe("register", () => {
    it("creates an onlineCustomer and returns a token", async () => {
      const result = await authService.register({
        fullName: "Nguyen Van A",
        email: "a@example.com",
        phone: "0900000001",
        password: "password123",
      });
      expect(result.token).toBeTypeOf("string");
      expect(result.user.role).toBe("onlineCustomer");
      expect(result.user.accountType).toBe("registered");
    });

    it("rejects a missing fullName", async () => {
      await expect(
        authService.register({ email: "b@example.com", password: "password123" }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects an invalid email format", async () => {
      await expect(
        authService.register({ fullName: "A", email: "not-an-email", password: "password123" }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects a password under 8 characters", async () => {
      await expect(
        authService.register({ fullName: "A", email: "c@example.com", password: "short1" }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("accepts a password of exactly 8 characters (boundary)", async () => {
      const result = await authService.register({
        fullName: "A", email: "d@example.com", password: "12345678",
      });
      expect(result.user).toBeDefined();
    });

    it("rejects a duplicate email with 409", async () => {
      await authService.register({ fullName: "A", email: "dup@example.com", password: "password123" });
      await expect(
        authService.register({ fullName: "B", email: "dup@example.com", password: "password123" }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("login", () => {
    it("logs in with correct credentials", async () => {
      const { password } = await createUser({ email: "login@example.com", role: "onlineCustomer" });
      const result = await authService.login({ email: "login@example.com", password });
      expect(result.token).toBeTypeOf("string");
    });

    it("rejects missing email or password", async () => {
      await expect(authService.login({ email: "x@example.com" })).rejects.toMatchObject({ status: 400 });
    });

    it("rejects an unknown email with 401 (no account probing)", async () => {
      await expect(
        authService.login({ email: "nope@example.com", password: "whatever1" }),
      ).rejects.toMatchObject({ status: 401 });
    });

    it("rejects a wrong password with 401", async () => {
      await createUser({ email: "wrongpw@example.com" });
      await expect(
        authService.login({ email: "wrongpw@example.com", password: "wrongpass" }),
      ).rejects.toMatchObject({ status: 401 });
    });

    it("rejects a deactivated account with 403", async () => {
      const { password } = await createUser({ email: "inactive@example.com", isActive: false });
      await expect(
        authService.login({ email: "inactive@example.com", password }),
      ).rejects.toMatchObject({ status: 403 });
    });

    it("rejects a walkInCustomer (non-login role) with 401", async () => {
      const { user, password } = await createUser({ role: "walkInCustomer", accountType: "walkIn" });
      // walk-in accounts normally have no passwordHash; force one to isolate the role check.
      user.passwordHash = (await createUser({})).user.passwordHash;
      await user.save();
      await expect(
        authService.login({ email: user.email, password }),
      ).rejects.toMatchObject({ status: 401 });
    });
  });

  describe("getMe", () => {
    it("returns the user for a valid id", async () => {
      const { user } = await createUser({});
      const result = await authService.getMe(user._id.toString());
      expect(result.user._id.toString()).toBe(user._id.toString());
    });

    it("throws 404 for a missing user", async () => {
      const { user } = await createUser({});
      const id = user._id.toString();
      await UserModel.deleteOne({ _id: id });
      await expect(authService.getMe(id)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("createStaff", () => {
    it("creates a staff account with an allowed role", async () => {
      const { user: admin } = await createUser({ role: "admin" });
      const result = await authService.createStaff(
        { fullName: "Tech A", email: "tech@example.com", password: "password123", role: "technician" },
        admin._id.toString(),
      );
      expect(result.user.role).toBe("technician");
      expect(result.user.createdBy.toString()).toBe(admin._id.toString());
    });

    it("rejects a non-staff role", async () => {
      await expect(
        authService.createStaff(
          { fullName: "X", email: "x@example.com", password: "password123", role: "onlineCustomer" },
          "someAdminId",
        ),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("updateMe", () => {
    it("updates fullName", async () => {
      const { user } = await createUser({});
      const result = await authService.updateMe(user._id.toString(), { fullName: "New Name" });
      expect(result.user.fullName).toBe("New Name");
    });

    it("rejects an empty fullName", async () => {
      const { user } = await createUser({});
      await expect(
        authService.updateMe(user._id.toString(), { fullName: "   " }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects changing to an email already used by another user", async () => {
      const { user: other } = await createUser({ email: "taken@example.com" });
      const { user } = await createUser({});
      await expect(
        authService.updateMe(user._id.toString(), { email: "taken@example.com" }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("changes password when currentPassword is correct", async () => {
      const { user, password } = await createUser({});
      const result = await authService.updateMe(user._id.toString(), {
        currentPassword: password,
        newPassword: "newpassword1",
      });
      expect(result.user).toBeDefined();
      const relogged = await authService.login({ email: user.email, password: "newpassword1" });
      expect(relogged.token).toBeTypeOf("string");
    });

    it("rejects a wrong currentPassword", async () => {
      const { user } = await createUser({});
      await expect(
        authService.updateMe(user._id.toString(), {
          currentPassword: "wrongwrong",
          newPassword: "newpassword1",
        }),
      ).rejects.toMatchObject({ status: 401 });
    });
  });

  describe("deleteMe", () => {
    it("deactivates the account", async () => {
      const { user } = await createUser({});
      const result = await authService.deleteMe(user._id.toString());
      expect(result.message).toMatch(/deactivated/i);
      const reloaded = await UserModel.findById(user._id);
      expect(reloaded.isActive).toBe(false);
    });
  });

  describe("forgotPassword / verifyOtp / resetPassword", () => {
    it("issues an OTP for a login-capable account and it can reset the password", async () => {
      const { user } = await createUser({ email: "otp@example.com" });
      const forgot = await authService.forgotPassword({ email: "otp@example.com" });
      expect(forgot.devCode).toBeTypeOf("string");

      const reset = await authService.resetPassword({
        email: "otp@example.com",
        otp: forgot.devCode,
        newPassword: "brandnewpass1",
      });
      expect(reset.message).toMatch(/reset/i);

      const relogged = await authService.login({ email: user.email, password: "brandnewpass1" });
      expect(relogged.token).toBeTypeOf("string");
    });

    it("does not issue a devCode for a non-existent account (no probing)", async () => {
      const forgot = await authService.forgotPassword({ email: "ghost@example.com" });
      expect(forgot.devCode).toBeUndefined();
    });

    it("rejects an invalid email", async () => {
      await expect(authService.forgotPassword({ email: "bad" })).rejects.toMatchObject({ status: 400 });
    });

    it("verifyOtp marks emailVerification accounts verified and consumes the code", async () => {
      const { user } = await createUser({ email: "verify@example.com", isEmailVerified: false });
      const sent = await authService.sendOtp({ email: "verify@example.com" });
      const result = await authService.verifyOtp({ email: "verify@example.com", otp: sent.devCode });
      expect(result.verified).toBe(true);
      const reloaded = await UserModel.findById(user._id);
      expect(reloaded.isEmailVerified).toBe(true);

      // Re-using the same (now-consumed) code fails.
      await expect(
        authService.verifyOtp({ email: "verify@example.com", otp: sent.devCode }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects a wrong OTP code", async () => {
      await createUser({ email: "wrongotp@example.com" });
      await authService.sendOtp({ email: "wrongotp@example.com" });
      await expect(
        authService.verifyOtp({ email: "wrongotp@example.com", otp: "000000" }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("sendOtp 404s for an unknown account", async () => {
      await expect(authService.sendOtp({ email: "unknown@example.com" })).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
