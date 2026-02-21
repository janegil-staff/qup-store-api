
import app from "./app.ts";
import { createServer } from "http";
import env from "./config/env.js";
import connectDB from "./config/db.js";
import { initSocket } from "./socket/index.js";

const server = createServer(app);

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
