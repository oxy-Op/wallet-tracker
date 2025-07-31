import { Request } from "express";
import { IdlEvents, IdlTypes } from "@coral-xyz/anchor";
import { Jupiter } from "./idl/jupiter";
import { ParsedTransactionWithMeta, PublicKey } from "@solana/web3.js";

export interface AppRequest extends Request {
  startTime?: number;
}

export interface TokenInfo {
  address: string;
  name?: string;
  symbol?: string;
  decimals: number;
  image?: string;
  metadataUri?: string;
}

export interface FormattedAmount {
  raw: string;
  formatted: string;
  usd?: string;
}

export interface FormattedToken extends TokenInfo {
  amount: FormattedAmount;
}

export interface FormattedRoute {
  amm: string;
  ammName: string;
  inputToken: FormattedToken;
  outputToken: FormattedToken;
}

export interface FormattedTrade {
  signature: string;
  timestamp: number;
  inputToken: FormattedToken;
  outputToken: FormattedToken;
  route: FormattedRoute[];
  slippage: string;
  priceImpact: string;
}

export type SwapEvent = IdlEvents<Jupiter>["SwapEvent"];
export type FeeEvent = IdlEvents<Jupiter>["FeeEvent"];

export interface ParsedSwap {
  amm: string;
  inputMint: string;
  inputAmount: string;
  outputMint: string;
  outputAmount: string;
}

export interface ParsedFee {
  account: string;
  mint: string;
  amount: string;
}

export interface ParsedJupiterTransaction {
  feeEvents: ParsedFee[];
  swaps: ParsedSwap[];
  slippageBps?: string;
  timestamp?: number;
  quotedOutAmount?: string;
  actualOutAmount: string;
}

export interface TradeInfo extends ParsedJupiterTransaction {
  signature: string;
}

export type AMMParser = (
  tx: ParsedTransactionWithMeta
) => ParsedJupiterTransaction | null;

type RoutePlanStep = IdlTypes<Jupiter>["RoutePlanStep"];
export type RoutePlan = RoutePlanStep[];

export interface PartialInstruction {
  programId: PublicKey;
  data: string /** Expecting base58 */;
  accounts: PublicKey[];
}
