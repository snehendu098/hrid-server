import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

import { Hono } from "hono";
import agentRoutes from "./routes/agent.route";
import collateralRoutes from "./routes/collateral.route";
import borrowRoutes from "./routes/borrow.route";
import lendRoutes from "./routes/lend.route";

const app = new Hono();

app.get("/api/v1/health", async (c) => {
  return c.json({ success: true, message: "API is running" });
});

app.route("/agent", agentRoutes);
app.route("/collateral", collateralRoutes);
app.route("/borrow", borrowRoutes);
app.route("/lend", lendRoutes);

export default {
  fetch: app.fetch,
  port: 3000,
  idleTimeout: 40,
};
