import fs from "fs";
import path from "path";
import { ParsedTransactionWithMeta, PublicKey } from "@solana/web3.js";
import { getTransaction as getTransactionFromRPC } from "@/utils";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

// Helper function to convert programIds to PublicKey objects
const convertProgramIds = (data: any): any => {
  if (!data) return data;

  if (typeof data === "object") {
    if (Array.isArray(data)) {
      return data.map((item) => convertProgramIds(item));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === "programId" && typeof value === "string") {
        result[key] = new PublicKey(value);
      } else if (typeof value === "object") {
        result[key] = convertProgramIds(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return data;
};

export const getTransaction = async (
  signature: string
): Promise<ParsedTransactionWithMeta> => {
  const fixturePath = path.join(FIXTURES_DIR, `${signature}.json`);

  if (!fs.existsSync(fixturePath)) {
    const transaction = await getTransactionFromRPC(signature);
    if (!transaction) {
      throw new Error(`Transaction not found for signature: ${signature}`);
    }
    await createFixture(
      signature,
      transaction as unknown as ParsedTransactionWithMeta
    );
    return transaction as unknown as ParsedTransactionWithMeta;
  }

  const fixtureData = await fs.promises.readFile(fixturePath, "utf-8");
  const parsedData = JSON.parse(fixtureData);

  // Ensure the transaction data structure is correct
  if (!parsedData.meta || !parsedData.transaction) {
    throw new Error("Invalid transaction data in fixture");
  }

  // Convert programIds back to PublicKey objects
  return convertProgramIds(parsedData);
};

export const createFixture = async (
  signature: string,
  data: ParsedTransactionWithMeta
): Promise<void> => {
  if (!fs.existsSync(FIXTURES_DIR)) {
    await fs.promises.mkdir(FIXTURES_DIR, { recursive: true });
  }

  // Convert PublicKey objects to strings for storage
  const dataToSave = JSON.parse(
    JSON.stringify(data, (key, value) => {
      if (
        value &&
        typeof value === "object" &&
        value.constructor.name === "PublicKey"
      ) {
        return value.toString();
      }
      return value;
    })
  );

  const fixturePath = path.join(FIXTURES_DIR, `${signature}.json`);
  await fs.promises.writeFile(fixturePath, JSON.stringify(dataToSave, null, 2));
};
