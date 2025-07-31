import { Provider } from "@coral-xyz/anchor";
import { Jupiter, IDL } from "../../idl/jupiter";
import { Event, Program, utils } from "@coral-xyz/anchor";
import { JUPITER_V6_PROGRAM_ID } from "../../lib/constants";
import { ParsedTransactionWithMeta } from "@solana/web3.js";
import { InstructionParser } from "./instructions";
import { parseJupiterEvents as parseEvents } from "./events";
import { ParsedJupiterTransaction } from "@/types";
import logger from "../../lib/logger";

export const program = new Program<Jupiter>(
  IDL,
  JUPITER_V6_PROGRAM_ID,
  {} as Provider
);

export function parseJupiterTransaction(
  transaction: ParsedTransactionWithMeta
): ParsedJupiterTransaction | null {
  try {
    const parser = new InstructionParser(JUPITER_V6_PROGRAM_ID);

    const instructions = parser.getInstructions(transaction);
    if (!instructions.length) return null;

    let slippageBps: string | undefined;
    let quotedOutAmount: string | undefined;

    try {
      slippageBps = parser.getSlippageBps(instructions);
      quotedOutAmount = parser.getExactOutAmount(instructions);

      logger.info(`slippageBps: ${slippageBps}`);
      logger.info(`quotedOutAmount: ${quotedOutAmount}`);
    } catch (error) {
      console.error("Error parsing instruction data:", error);
    }

    const parsedEvents = parseEvents(program, transaction);
    if (!parsedEvents?.parsedSwapEvents?.length) return null;

    let timestamp = transaction.blockTime;

    // If no blockTime, estimate from slot (each slot is ~400ms)
    if (!timestamp && transaction.slot) {
      // Solana's slot 0 started at timestamp 1598931600 (Sep 1, 2020)
      const SLOT_0_TIMESTAMP = 1598931600;
      const SLOT_TIME_MS = 400;
      timestamp = Math.floor(
        SLOT_0_TIMESTAMP + (transaction.slot * SLOT_TIME_MS) / 1000
      );
      logger.debug(`Estimated timestamp from slot ${transaction.slot}`);
    }

    logger.info(`timestamp: ${timestamp}`);

    // Get actual output amount from the last swap event
    const actualOutAmount =
      parsedEvents.parsedSwapEvents[parsedEvents.parsedSwapEvents.length - 1]
        ?.outputAmount;

    return {
      feeEvents: parsedEvents.parsedFeeEvents,
      swaps: parsedEvents.parsedSwapEvents,
      slippageBps,
      timestamp: timestamp || undefined,
      quotedOutAmount,
      actualOutAmount,
    };
  } catch (error) {
    console.error("Error parsing Jupiter transaction:", error);
    console.error(error);
    return null;
  }
}
