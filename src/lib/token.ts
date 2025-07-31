import { PrismaClient } from "@prisma/client";
import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js";
import { fetchAllDigitalAsset } from "@metaplex-foundation/mpl-token-metadata";
import umi from "./umi";
import { publicKey } from "@metaplex-foundation/umi";
import logger from "./logger";

const tokenCache = new Map<string, TokenInfo>();
const prisma = new PrismaClient();

import { TokenInfo } from "../types";

async function fetchTokenMetadatas(
  connection: Connection,
  addresses: string[]
): Promise<{ validTokens: TokenInfo[]; fallbackTokens: TokenInfo[] }> {
  try {
    const mintInfos = await connection.getMultipleParsedAccounts(
      addresses.map((address) => new PublicKey(address)),
      {
        dataSlice: {
          offset: 44, // mintAuthority(4+32) + supply(8)
          length: 1, // decimals(1)
        },
      }
    );

    const tokenToDecimals = new Map<string, number>();
    for (const mintInfo of mintInfos.value) {
      // Skip undefined mintInfo or mintInfo.data to preserve array index alignment
      if (!mintInfo || !mintInfo.data) {
        continue;
      }

      if (
        "parsed" in mintInfo.data &&
        mintInfo.data.parsed.info.decimals !== undefined
      ) {
        tokenToDecimals.set(
          addresses[mintInfos.value.indexOf(mintInfo)],
          mintInfo.data.parsed.info.decimals
        );
      }
    }

    const tokens = await fetchAllDigitalAsset(
      umi,
      Array.from(tokenToDecimals.keys()).map((address) => publicKey(address))
    );

    const validTokens: TokenInfo[] = [];
    const fallbackTokens: TokenInfo[] = [];

    // First process tokens that were found with metadata
    for (const token of tokens) {
      const address = token.publicKey.toString();
      const decimals = tokenToDecimals.get(address);

      if (!decimals) {
        logger.warn(`No decimals found for token ${address}`);
        continue;
      }

      validTokens.push({
        address,
        name: token.metadata.name,
        symbol: token.metadata.symbol,
        decimals,
        metadataUri: token.metadata.uri,
      });

      // Remove from tokenToDecimals so we know which ones weren't found
      tokenToDecimals.delete(address);
    }

    // Process remaining tokens that have decimals but no metadata
    for (const [address, decimals] of tokenToDecimals.entries()) {
      const shortAddr = `${address.slice(0, 4)}...${address.slice(-4)}`;
      fallbackTokens.push({
        address,
        name: "Unknown Token",
        symbol: shortAddr,
        decimals,
        metadataUri: "",
      });
    }

    logger.info(
      `Found ${validTokens.length} tokens with metadata and ${fallbackTokens.length} tokens without metadata`
    );

    return {
      validTokens,
      fallbackTokens,
    };
  } catch (error) {
    console.error("Error fetching token metadata:", error);
    return { validTokens: [], fallbackTokens: [] };
  }
}

export async function getTokensInfo(
  addresses: string[],
  connection: Connection
): Promise<Map<string, TokenInfo>> {
  const result = new Map<string, TokenInfo>();
  const uniqueAddresses = [...new Set(addresses)];

  logger.info(`Fetching info for ${uniqueAddresses.length} tokens`);

  uniqueAddresses.forEach((addr) => {
    const cached = tokenCache.get(addr);
    if (cached) {
      result.set(addr, cached);
      logger.debug(`Found token ${addr} in memory cache`);
    }
  });

  const uncachedAddresses = uniqueAddresses.filter((addr) => !result.has(addr));

  if (uncachedAddresses.length === 0) {
    logger.info("All tokens found in memory cache");
    return result;
  }

  const existingTokens = await prisma.token.findMany({
    where: {
      address: {
        in: uncachedAddresses,
      },
    },
  });

  logger.info(`Found ${existingTokens.length} tokens in database`);

  for (const token of existingTokens) {
    const tokenInfo = {
      address: token.address,
      name: token.name || undefined,
      symbol: token.symbol || undefined,
      decimals: token.decimals || 0,
      image: token.image || undefined,
      metadataUri: token.metadataUri || undefined,
    };
    result.set(token.address, tokenInfo);
    tokenCache.set(token.address, tokenInfo);
  }

  const addressesToFetch = uncachedAddresses.filter(
    (addr) => !result.has(addr)
  );

  if (addressesToFetch.length > 0) {
    logger.info(`Fetching ${addressesToFetch.length} tokens from chain`);

    const { validTokens, fallbackTokens } = await fetchTokenMetadatas(
      connection,
      addressesToFetch
    );

    logger.info(
      `Successfully fetched ${validTokens.length} valid tokens and ${fallbackTokens.length} fallback tokens from chain`
    );

    // Store and add valid tokens to result
    for (const token of validTokens) {
      try {
        await prisma.token.create({
          data: {
            address: token.address,
            name: token.name || null,
            symbol: token.symbol || null,
            decimals: token.decimals || null,
            image: token.image || null,
            metadataUri: token.metadataUri || null,
          },
        });
        result.set(token.address, token);
        tokenCache.set(token.address, token);
      } catch (error) {
        logger.error(`Error storing token ${token.address}:`, error);
      }
    }

    // Add fallback tokens to result but don't store them
    for (const token of fallbackTokens) {
      result.set(token.address, token);
    }
  }

  return result;
}

// async function main() {
//   const tokens = await fetchTokenMetadatas(
//     new Connection(process.env.RPC_URL!),
//     [
//       "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump",
//       "So11111111111111111111111111111111111111112",
//       "So11111111111111111111111111111111111111115",
//     ]
//   );
//   console.log(tokens);
// }

// main();
