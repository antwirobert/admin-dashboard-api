import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import orderRoutes from "./routes/orders.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import dashboardRoutes from "./routes/dashboard.js";

const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.listen(PORT, () =>
  console.log(`Server is running on port http://localhost:${PORT}`),
);
