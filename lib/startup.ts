import { connectDB } from "./db";
import { connectRedis } from "./redis";

export async function connectAll() {
  await Promise.all([connectDB(), connectRedis()]);
}