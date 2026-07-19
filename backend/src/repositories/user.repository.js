import { UserModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const userRepository = {
  ...createRepository(UserModel),
  findByEmail: (email) => UserModel.findOne({ email }),
};
