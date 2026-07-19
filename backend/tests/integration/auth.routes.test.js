import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

describe("Auth API", () => {
  it("POST /api/auth/register creates an account and returns a token", async () => {
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Nguyen Van A",
      email: "reg@example.com",
      phone: "0900000001",
      password: "password123",
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user.role).toBe("onlineCustomer");
  });

  it("POST /api/auth/register rejects a short password with 400", async () => {
    const res = await request(app).post("/api/auth/register").send({
      fullName: "A", email: "b@example.com", password: "short",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTypeOf("string");
  });

  it("POST /api/auth/login authenticates and GET /api/auth/me returns the profile", async () => {
    const { user, password } = await createUser({ email: "login@example.com" });
    const login = await request(app).post("/api/auth/login").send({ email: user.email, password });
    expect(login.status).toBe(200);

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user._id).toBe(user._id.toString());
  });

  it("GET /api/auth/me without a token is 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/staff requires admin role (403 for serviceAdvisor)", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const res = await request(app)
      .post("/api/auth/staff")
      .set(authHeader(advisor))
      .send({ fullName: "T", email: "t@example.com", password: "password123", role: "technician" });
    expect(res.status).toBe(403);
  });

  it("POST /api/auth/staff as admin creates a staff account", async () => {
    const { user: admin } = await createUser({ role: "admin" });
    const res = await request(app)
      .post("/api/auth/staff")
      .set(authHeader(admin))
      .send({ fullName: "Tech A", email: "techA@example.com", password: "password123", role: "technician" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("technician");
  });

  it("PUT /api/auth/me updates the caller's own profile", async () => {
    const { user } = await createUser({});
    const res = await request(app).put("/api/auth/me").set(authHeader(user)).send({ fullName: "Updated" });
    expect(res.status).toBe(200);
    expect(res.body.user.fullName).toBe("Updated");
  });

  it("DELETE /api/auth/me deactivates the account", async () => {
    const { user } = await createUser({});
    const res = await request(app).delete("/api/auth/me").set(authHeader(user));
    expect(res.status).toBe(200);
  });

  it("forgot-password -> reset-password full round trip", async () => {
    const { user } = await createUser({ email: "flow@example.com" });
    const forgot = await request(app).post("/api/auth/forgot-password").send({ email: user.email });
    expect(forgot.status).toBe(200);
    const code = forgot.body.devCode;
    expect(code).toBeTypeOf("string");

    const reset = await request(app)
      .post("/api/auth/reset-password")
      .send({ email: user.email, otp: code, newPassword: "brandnew123" });
    expect(reset.status).toBe(200);

    const login = await request(app).post("/api/auth/login").send({ email: user.email, password: "brandnew123" });
    expect(login.status).toBe(200);
  });
});
