import { describe, it, expect, beforeAll } from "vitest";
import { getTransaction } from "./utils";
import { parseJupiterEvents } from "../jupiter/events";
import dotenv from "dotenv";
import { program } from "../jupiter";

dotenv.config();

describe("Jupiter Parser", () => {
  describe("parseSwapTransaction", () => {
    // Example test signatures for different scenarios
    const signatures = {
      directSwap:
        "3d6WG9dppe2ZnTbebFgaEbMSgDtgUPDgJSNmUben22khyBKBfuhtLg92BLnma2gm5AataBiKi2iNhVsDHCNZDURA",
      cpiSwap:
        "4UiMGaHbySq4RxHuL8aV1LChw57mWjAQXPr2vTn6ndd8bduJt5CU985W3TsqyD4zWCfJ9s51tSu89tV4XL5oBAK8",
      routedSwap:
        "2VC1NfTG4v7ryH7ryEf4mY8zaa3CxBiAp7uqNuqiz69hpah8vhjcSXUEVAPK6R4XBcPfAZ3uCuK7NSiM7YQqm57U",
      failedSwap:
        "3n1zxfXvrX6gUQG2fufQoCQHQg1kNx5D63bTcsge9D6bCqnuwdN8ABu8tUvRr9RLnKmYepF4QD82A6HqTBAyLnma",
    };

    it("should parse a direct swap transaction correctly", async () => {
      const tx = await getTransaction(signatures.directSwap);
      const result = parseJupiterEvents(program, tx);

      const actualResult = [
        {
          amm: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
          inputMint: "So11111111111111111111111111111111111111112",
          inputAmount: "21112899",
          outputMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
          outputAmount: "4082119",
        },
        {
          amm: "obriQD1zbpyLz95G5n7nJe6a4DPjpFwa5XYPoNm113y",
          inputMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
          inputAmount: "4082119",
          outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          outputAmount: "4083318",
        },
        {
          amm: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
          inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          inputAmount: "4083318",
          outputMint: "7JA5eZdCzztSfQbJvS8aVVxMFfd81Rs9VvwnocV1mKHu",
          outputAmount: "24342982929",
        },
        {
          amm: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
          inputMint: "7JA5eZdCzztSfQbJvS8aVVxMFfd81Rs9VvwnocV1mKHu",
          inputAmount: "24342982929",
          outputMint: "So11111111111111111111111111111111111111112",
          outputAmount: "21135942",
        },
      ];

      expect(result?.parsedSwapEvents).toEqual(actualResult);
    });

    it("should parse a cpi swap transaction correctly", async () => {
      const tx = await getTransaction(signatures.cpiSwap);
      const result = parseJupiterEvents(program, tx);
      const actualResult = [
        {
          amm: "2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c",
          inputMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
          inputAmount: "774440889",
          outputMint: "So11111111111111111111111111111111111111112",
          outputAmount: "3993178025",
        },
        {
          amm: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
          inputMint: "So11111111111111111111111111111111111111112",
          inputAmount: "3993178025",
          outputMint: "GekTNfm84QfyP2GdAHZ5AgACBRd69aNmgA5FDhZupump",
          outputAmount: "174183982008",
        },
      ];
      expect(result?.parsedSwapEvents).toEqual(actualResult);
    });

    it("should parse a routed swap transaction correctly", async () => {
      const tx = await getTransaction(signatures.routedSwap);
      const result = parseJupiterEvents(program, tx);
      const actualResult = [
        {
          amm: "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB",
          inputMint: "So11111111111111111111111111111111111111112",
          inputAmount: "501821686",
          outputMint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
          outputAmount: "411562726",
        },
      ];
      expect(result?.parsedSwapEvents).toEqual(actualResult);
    });

    it("should handle failed swap transactions", async () => {
      const tx = await getTransaction(signatures.failedSwap);
      const result = parseJupiterEvents(program, tx);
      const actualResult = [
        {
          amm: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
          inputMint: "So11111111111111111111111111111111111111112",
          inputAmount: "2954343735",
          outputMint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
          outputAmount: "171712433",
        },
        {
          amm: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
          inputMint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
          inputAmount: "171712433",
          outputMint: "So11111111111111111111111111111111111111112",
          outputAmount: "2946552612",
        },
      ];
      expect(result?.parsedSwapEvents).toEqual(actualResult);
    });

    describe("parseFeeEvent", () => {
      it("should parse fee events correctly", async () => {
        const tx = await getTransaction(
          "2i5sXha67iQkwGhwFGn262Gq3p1hRZ7ENUwdkSPzitrY39Egy69VPFVS3HtguP2pXK4z8hxDuAzbPeVQGTBC6dhv"
        );
        const { parsedFeeEvents } = parseJupiterEvents(program, tx) as {
          parsedFeeEvents: { account: string; mint: string; amount: string }[];
        };
        const actualResult = {
          account: "9hCLuXrQrHCU9i7y648Nh7uuWKHUsKDiZ5zyBHdZPWtG",
          mint: "So11111111111111111111111111111111111111112",
          amount: "920000",
        };
        expect(parsedFeeEvents).toEqual([actualResult]);
      });
    });
  });
});
