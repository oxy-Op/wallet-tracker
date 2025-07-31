import {
  Connection,
  ParsedTransactionWithMeta,
  PublicKey,
} from "@solana/web3.js";
import { parseJupiterTransaction } from "../parser/jupiter";
import { getTokensInfo } from "../lib/token";
import { EventEmitter } from "events";
import logger from "../lib/logger";
import { formatTrade } from "../lib/trade";
import { AMMParser, TradeInfo, TokenInfo } from "../types";

const AMM_PARSERS: AMMParser[] = [parseJupiterTransaction];

interface FetchOptions {
  batchSize?: number;
  limit?: number;
  until?: string;
  onData?: (data: {
    signature: string;
    trade: TradeInfo | null;
    tokenInfo?: Map<string, TokenInfo>;
  }) => void;
}

export class WalletService extends EventEmitter {
  static Events = {
    TRADE: "trade",
    TOKEN_INFO: "tokenInfo",
    ERROR: "error",
  } as const;

  private connection: Connection;
  private wallet: PublicKey;
  private static BATCH_SIZE = 100;

  constructor(connection: Connection, walletAddress: string) {
    super();
    this.connection = connection;
    this.wallet = new PublicKey(walletAddress);
  }

  private async fetchTransactionBatch(
    signatures: string[],
    retryCount = 0
  ): Promise<(ParsedTransactionWithMeta | null)[]> {
    try {
      logger.info(`Fetching batch of ${signatures.length} transactions`);
      const startTime = Date.now();

      const result = await this.connection.getParsedTransactions(signatures, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });

      const duration = Date.now() - startTime;
      logger.info(
        `Fetched ${result.filter(Boolean).length}/${
          signatures.length
        } transactions in ${duration}ms`
      );

      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes("429")) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        logger.warn(
          `Rate limited, retrying after ${delay}ms (attempt ${retryCount + 1})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchTransactionBatch(signatures, retryCount + 1);
      }
      logger.error("Error fetching transactions:", error);
      return signatures.map(() => null);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async processBatch(
    signatures: string[],
    transactions: (ParsedTransactionWithMeta | null)[]
  ): Promise<TradeInfo[]> {
    const validTrades: TradeInfo[] = [];

    for (const [index, tx] of transactions.entries()) {
      if (!tx) continue;
      const signature = signatures[index];

      if (tx.meta?.err) {
        logger.warn(`Transaction ${signature} failed: ${tx.meta.err}`);
        continue;
      }

      logger.info(`Processing transaction ${signature}`);
      logger.debug("Transaction logs:", tx.meta?.logMessages);

      for (const parser of AMM_PARSERS) {
        const trade = parser(tx);
        if (trade?.swaps.length) {
          logger.info(`Found Jupiter trade in ${signature}`);
          logger.debug("Trade details:", trade);

          const mints = new Set<string>();
          trade.swaps.forEach((swap) => {
            mints.add(swap.inputMint);
            mints.add(swap.outputMint);
          });

          const tokenInfo = await getTokensInfo(
            Array.from(mints),
            this.connection
          );

          const tradeInfo: TradeInfo = {
            signature,
            swaps: trade.swaps,
            slippageBps: trade.slippageBps,
            feeEvents: trade.feeEvents,
            timestamp: trade.timestamp,
            actualOutAmount: trade.actualOutAmount,
            quotedOutAmount: trade.quotedOutAmount,
          };

          try {
            const formattedTrade = formatTrade(tradeInfo, tokenInfo);
            this.emit(WalletService.Events.TRADE, {
              signature,
              trade: formattedTrade,
            });
            validTrades.push(tradeInfo);
          } catch (error) {
            logger.error(`Error formatting trade ${signature}:`, error);
            // this.emit(WalletService.Events.TRADE, { signature, trade: null });
          }

          break;
        } else {
          logger.debug(`No Jupiter trade found in ${signature}`);
        }
      }

      if (
        validTrades.length === 0 ||
        validTrades[validTrades.length - 1].signature !== signature
      ) {
        // this.emit(WalletService.Events.TRADE, { signature, trade: null });
      }
    }

    return validTrades;
  }

  async getTradeHistory(options: FetchOptions = {}): Promise<TradeInfo[]> {
    const {
      batchSize = WalletService.BATCH_SIZE,
      limit = 1000,
      until,
    } = options;

    const trades: TradeInfo[] = [];
    logger.info(`Fetching signatures for wallet ${this.wallet.toString()}`);
    const startTime = Date.now();

    let allSignatures = await this.connection.getSignaturesForAddress(
      this.wallet,
      {
        limit,
        ...(until && { before: until }),
      },
      "confirmed"
    );

    logger.info(
      `Found ${allSignatures.length} total signatures in ${
        Date.now() - startTime
      }ms`
    );

    // Remove duplicate signatures
    const uniqueSignatures = new Map();
    allSignatures.forEach((sig) => {
      if (!uniqueSignatures.has(sig.signature)) {
        uniqueSignatures.set(sig.signature, sig);
      }
    });
    allSignatures = Array.from(uniqueSignatures.values());

    logger.info(`Processing ${allSignatures.length} unique signatures`);

    const batchCount = Math.ceil(allSignatures.length / batchSize);
    let processedTrades = 0;
    let jupiterTrades = 0;

    for (let i = 0; i < batchCount; i++) {
      const batchSignatures = allSignatures
        .slice(i * batchSize, (i + 1) * batchSize)
        .map((sig) => sig.signature);

      logger.info(
        `Processing batch ${i + 1}/${batchCount} with ${
          batchSignatures.length
        } signatures`
      );

      const transactions = await this.fetchTransactionBatch(batchSignatures);
      const batchTrades = await this.processBatch(
        batchSignatures,
        transactions
      );

      processedTrades += transactions.filter(Boolean).length;
      jupiterTrades += batchTrades.length;

      if (batchTrades.length > 0) {
        trades.push(...batchTrades);
        logger.info(
          `Found ${batchTrades.length} Jupiter trades in batch ${i + 1}`
        );
      }

      if (i < batchCount - 1) {
        await this.sleep(500);
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    logger.info(
      `Processing complete in ${duration.toFixed(
        1
      )}s: ${processedTrades} transactions processed, ${jupiterTrades} Jupiter trades found`
    );

    return trades;
  }
}
