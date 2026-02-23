import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import env from "./config/env.js";
import connectDB from "./config/db.js";
import routes from "./routes/index.js";
import errorHandler from "./middleware/errorHandler.js";
import { initSocket } from "./socket/index.js";

const app = express();
const server = createServer(app);

// ─── Middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────────────
app.use("/api", routes);

// ─── Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  initSocket(server);

  server.listen(env.PORT, () => {
    console.log(`
🚀 Artisan Market API running
📡 Port: ${env.PORT}
🌍 Env: ${env.NODE_ENV}
🔌 Socket.io: ready
    `);
  });
};

start().catch(console.error);

export default app;
