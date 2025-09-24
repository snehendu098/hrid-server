import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

import { Hono } from "hono";

const app = new Hono();

app.get("/api/v1/health", async (c) => {
  return c.json({ success: true, message: "API is running" });
});

export default app;
