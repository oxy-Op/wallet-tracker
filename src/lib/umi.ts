import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const umi = createUmi(RPC_URL).use(mplTokenMetadata());

export default umi;
