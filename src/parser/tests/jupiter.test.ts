import { describe, it, expect, beforeAll } from "vitest";
import { getTransaction } from "./utils";
import { parseJupiterEvents } from "../jupiter/events";
import dotenv from "dotenv";
import { parseJupiterTransaction, program } from "../jupiter";
import { InstructionParser } from "../jupiter/instructions";
import { JUPITER_V6_PROGRAM_ID } from "@/lib/constants";

dotenv.config();

describe("Jupiter Instructions Parser", () => {
  it("should parse route instruction to get slippage", async () => {
    const tx = await getTransaction(
      "4pbVHsiy143cVTadytsEPfxKLzZDAF99fejfZX18Pia4jDLGLXEJzkvT1kiF4KXjmV3Jmw8r2jdnWB5xmMmkiaHt"
    );
    const result = parseJupiterTransaction(tx);
    console.log(result);
    expect(result).toBeDefined();
  });
});
