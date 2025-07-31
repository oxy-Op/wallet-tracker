import { Event, Program, utils } from "@coral-xyz/anchor";
import { JUPITER_V6_PROGRAM_ID } from "../../lib/constants";
import { FeeEvent } from "../../types";
import { Jupiter } from "../../idl/jupiter";
import { SwapEvent } from "../../types";
import { ParsedTransactionWithMeta } from "@solana/web3.js";

export function getEvents(
  program: Program<Jupiter>,
  transactionResponse: ParsedTransactionWithMeta
) {
  let events: Event[] = [];

  if (transactionResponse && transactionResponse.meta) {
    let { meta } = transactionResponse;

    meta.innerInstructions?.map(async (ix) => {
      ix.instructions.map(async (iix) => {
        if (!iix.programId.equals(JUPITER_V6_PROGRAM_ID)) return;
        if (!("data" in iix)) return; // Guard in case it is a parsed decoded instruction

        const ixData = utils.bytes.bs58.decode(iix.data);
        const eventData = utils.bytes.base64.encode(ixData.subarray(8));
        const event = program.coder.events.decode(eventData);

        if (!event) return;

        events.push(event);
      });
    });
  }

  return events;
}

export const reduceEventData = <T>(events: Event[], name: string) =>
  events.reduce((acc, event) => {
    if (event.name === name) {
      acc.push(event.data as T);
    }
    return acc;
  }, new Array<T>());

export const extractJupiterEvents = (
  program: Program<Jupiter>,
  transactionResponse: ParsedTransactionWithMeta
) => {
  const events = getEvents(program, transactionResponse);
  const swapEvents = reduceEventData<SwapEvent>(events, "SwapEvent");
  const feeEvents = reduceEventData<FeeEvent>(events, "FeeEvent");
  return { swapEvents, feeEvents };
};

export const parseJupiterEvents = (
  program: Program<Jupiter>,
  transactionWithMeta: ParsedTransactionWithMeta
) => {
  if (!transactionWithMeta) return null;
  const events = extractJupiterEvents(program, transactionWithMeta);
  const { swapEvents, feeEvents } = events;
  const parsedSwapEvents = swapEvents.map((event: SwapEvent) => {
    // Get mint accounts from transaction
    const inputMint = event.inputMint.toString();
    const outputMint = event.outputMint.toString();

    // Find input/output accounts in transaction
    const inputAccount = transactionWithMeta.meta?.preTokenBalances?.find(
      (b) => b.mint === inputMint
    );
    const outputAccount = transactionWithMeta.meta?.preTokenBalances?.find(
      (b) => b.mint === outputMint
    );

    return {
      amm: event.amm.toString(),
      inputMint,
      inputAmount: event.inputAmount.toString(),
      inputDecimals: inputAccount?.uiTokenAmount.decimals || 0,
      outputMint,
      outputAmount: event.outputAmount.toString(),
      outputDecimals: outputAccount?.uiTokenAmount.decimals || 0,
    };
  });
  const parsedFeeEvents = feeEvents.map((event: FeeEvent) => {
    return {
      account: event.account.toString(),
      mint: event.mint.toString(),
      amount: event.amount.toString(),
    };
  });
  return { parsedSwapEvents, parsedFeeEvents };
};
