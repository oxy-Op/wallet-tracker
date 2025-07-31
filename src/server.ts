import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "dotenv";
import { createServer } from "http";
import logger from "./lib/logger";
import { AppRequest } from "./types";
import walletRoutes from "./routes/wallet.routes";
import { initWebSocket } from "./lib/ws";

// Load environment variables
config();

const app = express();
const server = createServer(app);

// Initialize WebSocket
initWebSocket(server);

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Request timing middleware
app.use((req: AppRequest, _res, next) => {
  req.startTime = Date.now();
  next();
});

// Routes
app.use("/api/v1/wallets", walletRoutes);

// Error handling middleware
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error("Error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`WebSocket server is ready`);
});
