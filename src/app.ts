import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import errorHandler from "./middleware/errorHandler.js";
import routes from "./routes/index.js";

const app = express();

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

export default app;