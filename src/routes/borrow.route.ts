import { Hono } from "hono";

const borrowRoutes = new Hono();

borrowRoutes.post("/", async (c) => {});

export default borrowRoutes;
