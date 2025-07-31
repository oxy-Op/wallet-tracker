import { Connection } from "@solana/web3.js";

export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const validateSolanaAddress = (address: string): boolean => {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
};

export const getTransaction = async (signature: string) => {
  const connection = new Connection(process.env.RPC_URL!);
  const transaction = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
  return transaction;
};
