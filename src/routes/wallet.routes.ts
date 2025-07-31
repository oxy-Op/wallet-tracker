import { Router } from "express";
import { Connection } from "@solana/web3.js";
import { WalletService } from "../services/wallet.service";
import { getWebSocketManager } from "../lib/ws";
import logger from "../lib/logger";

const router = Router();

const connection = new Connection(
  process.env.RPC_URL || "https://api.mainnet-beta.solana.com"
);

const activeServices = new Map<string, WalletService>();

// Helper to get or create a wallet service
function getWalletService(address: string): WalletService {
  let service = activeServices.get(address);
  if (!service) {
    service = new WalletService(connection, address);
    activeServices.set(address, service);

    // Set up event handlers
    service.on(WalletService.Events.TRADE, (data) => {
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast(address, {
          type: "trade",
          data,
        });
      }
    });

    service.on(WalletService.Events.TOKEN_INFO, (data) => {
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast(address, {
          type: "tokenInfo",
          data,
        });
      }
    });

    service.on(WalletService.Events.ERROR, (error) => {
      logger.error(`Error in wallet service for ${address}:`, error);
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcast(address, {
          type: "error",
          error: error.message,
        });
      }
    });
  }
  return service;
}

// Get trade history
router.get("/:address/trades", async (req, res, next) => {
  try {
    const { address } = req.params;
    const { limit = "1000", until } = req.query;

    const service = getWalletService(address);
    const trades = await service.getTradeHistory({
      limit: parseInt(limit as string, 10),
      until: until as string,
    });

    res.json({
      success: true,
      data: trades,
    });
  } catch (error) {
    next(error);
  }
});

// Start analyzing trades
router.post("/:address/analyze", async (req, res, next) => {
  try {
    const { address } = req.params;
    const service = getWalletService(address);

    const wsManager = getWebSocketManager();
    logger.info("Checking WebSocket subscribers for address:", address);
    logger.info("Current subscribers:", wsManager?.getSubscriberCount(address));

    if (!wsManager || wsManager.getSubscriberCount(address) === 0) {
      throw new Error("No active WebSocket connection for this address");
    }

    // Send immediate response
    res.json({
      success: true,
      message: "Trade analysis started",
      status: "processing",
    });

    service
      .getTradeHistory({
        limit: parseInt(process.env.TRADE_LIMIT || "100", 10),
      })
      .then((trades) => {
        wsManager.broadcast(address, {
          type: "analysis_complete",
          data: {
            totalTrades: trades.length,
            timestamp: Date.now(),
          },
        });
      })
      .catch((error) => {
        logger.error("Error processing trades:", error);
        wsManager.broadcast(address, {
          type: "analysis_error",
          error: error.message,
        });
      });
  } catch (error) {
    next(error);
  }
});

// Stop analyzing trades
router.post("/:address/stop", (req, res) => {
  const { address } = req.params;
  const service = activeServices.get(address);

  if (service) {
    activeServices.delete(address);
  }

  res.json({
    success: true,
    message: "Trade analysis stopped",
  });
});

export default router;
