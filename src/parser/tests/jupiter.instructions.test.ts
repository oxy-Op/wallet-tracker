import { describe, it, expect, beforeAll } from "vitest";
import { getTransaction } from "./utils";
import { parseJupiterEvents } from "../jupiter/events";
import dotenv from "dotenv";
import { program } from "../jupiter";
import { InstructionParser } from "../jupiter/instructions";
import { JUPITER_V6_PROGRAM_ID } from "@/lib/constants";

dotenv.config();

describe("Jupiter Instructions Parser", () => {
  it("should parse route instruction to get slippage", async () => {
    const tx = await getTransaction(
      "Q9ExBCgYukeisEMGAsstpSj68Bts1EtHE9wyBC4NiHsXgx2bPtqPdCZCjDFh2QApR6dKWWMFWkdm6qcKw9aBG4R"
    );
    const parser = new InstructionParser(JUPITER_V6_PROGRAM_ID);
    const instructions = parser.getInstructions(tx);
    if (!instructions.length) return null;
    const slippageBps = parser.getSlippageBps(instructions);
    expect(slippageBps).toBe("2000");
  });
});
