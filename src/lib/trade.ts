import { TokenInfo, FormattedTrade, TradeInfo } from "../types";
import logger from "./logger";

function formatTokenAmount(amount: string, decimals: number): string {
  const value = Number(amount) / Math.pow(10, decimals);
  if (value < 0.000001) return value.toExponential(4);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: Math.min(decimals, 4),
    maximumFractionDigits: Math.min(decimals, 4),
  });
}

function getAmmName(ammAddress: string): string {
  const ammMap: Record<string, string> = {
    obriQD1zbpyLz95G5n7nJe6a4DPjpFwa5XYPoNm113y: "Orca",
    HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJutt: "GooseFX",
    "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP": "Penguin",
    JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "Jupiter Aggregator V6",
    LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo: "Meteora DLMM",
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium",
    whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: "Whirlpool",
    CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: "Raydium CLMM",
    PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY: "Phoenix",
    CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C: "Raydium CPMM",
    SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe: "SolFi",
  };
  return ammMap[ammAddress] || "Unknown";
}

export function calculatePriceImpact(
  quotedOutAmount: string | undefined,
  actualOutAmount: string,
  decimals: number
): string {
  if (!quotedOutAmount) return "Unknown";

  const exactValue = Number(quotedOutAmount) / Math.pow(10, decimals);
  const actualValue = Number(actualOutAmount) / Math.pow(10, decimals);

  logger.info(`exactValue: ${exactValue}`);
  logger.info(`actualValue: ${actualValue}`);

  const priceImpact = ((exactValue - actualValue) / exactValue) * 100;
  return `${Math.abs(priceImpact).toFixed(2)}%`;
}

export function formatTrade(
  trade: TradeInfo,
  tokenInfo: Map<string, TokenInfo>
): FormattedTrade {
  const swaps = trade.swaps;
  const firstSwap = swaps[0];
  const lastSwap = swaps[swaps.length - 1];

  const route = swaps.map((swap) => {
    const inputToken = tokenInfo.get(swap.inputMint);
    const outputToken = tokenInfo.get(swap.outputMint);

    if (!inputToken || !outputToken) {
      logger.warn(
        `No token info found for ${swap.inputMint} or ${swap.outputMint}`
      );
      return null;
    }

    return {
      amm: swap.amm,
      ammName: getAmmName(swap.amm),
      inputToken: {
        ...inputToken,
        amount: {
          raw: swap.inputAmount,
          formatted: formatTokenAmount(swap.inputAmount, inputToken.decimals),
        },
      },
      outputToken: {
        ...outputToken,
        amount: {
          raw: swap.outputAmount,
          formatted: formatTokenAmount(swap.outputAmount, outputToken.decimals),
        },
      },
    };
  });

  const inputToken = tokenInfo.get(firstSwap.inputMint);
  const outputToken = tokenInfo.get(lastSwap.outputMint);

  if (!inputToken || !outputToken) {
    logger.warn(
      `No token info found for ${firstSwap.inputMint} or ${lastSwap.outputMint}`
    );
    throw new Error(
      `No token info found for ${firstSwap.inputMint} or ${lastSwap.outputMint}`
    );
  }

  const priceImpact = calculatePriceImpact(
    trade.quotedOutAmount,
    trade.actualOutAmount,
    outputToken.decimals
  );

  logger.info(`priceImpact: ${priceImpact}`);

  return {
    signature: trade.signature,
    timestamp: trade.timestamp || Math.floor(Date.now() / 1000),
    inputToken: {
      ...inputToken,
      amount: {
        raw: firstSwap.inputAmount,
        formatted: formatTokenAmount(
          firstSwap.inputAmount,
          inputToken.decimals
        ),
      },
    },
    outputToken: {
      ...outputToken,
      amount: {
        raw: lastSwap.outputAmount,
        formatted: formatTokenAmount(
          lastSwap.outputAmount,
          outputToken.decimals
        ),
      },
    },
    route: route.filter((r) => r !== null),
    slippage: trade.slippageBps
      ? `${Number(trade.slippageBps) / 100}%`
      : "Unknown",
    priceImpact,
  };
}
