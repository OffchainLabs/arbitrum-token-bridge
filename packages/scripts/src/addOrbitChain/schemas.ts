import { z } from "zod";
import { ethers } from "ethers";
import { getOctokit } from "@actions/github";

export const TESTNET_PARENT_CHAIN_IDS = [11155111, 421614];

export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const addressSchema = z.string().refine(isValidAddress, {
  message: "Invalid Ethereum address",
});

export const urlSchema = z
  .string()
  .url({ message: "Invalid URL format." })
  .refine((url) => url.startsWith("https://"), {
    message: "URL must start with https://.",
  })
  .refine((url) => !url.endsWith("/"), {
    message: "URL must not have a trailing slash.",
  });
export const colorHexSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color hex");

export const descriptionSchema = z
  .string()
  .max(130)
  .transform((desc) => (desc.endsWith(".") ? desc : `${desc}.`));

export const ethBridgeSchema = z.object({
  bridge: addressSchema,
  inbox: addressSchema,
  outbox: addressSchema,
  rollup: addressSchema,
  sequencerInbox: addressSchema,
});

export const tokenBridgeSchema = z.object({
  parentCustomGateway: addressSchema,
  parentErc20Gateway: addressSchema,
  parentGatewayRouter: addressSchema,
  parentMulticall: addressSchema.optional(),
  parentProxyAdmin: addressSchema,
  parentWeth: addressSchema.optional(),
  parentWethGateway: addressSchema,
  childCustomGateway: addressSchema,
  childErc20Gateway: addressSchema,
  childGatewayRouter: addressSchema,
  childMulticall: addressSchema.optional(),
  childProxyAdmin: addressSchema,
  childWeth: addressSchema,
  childWethGateway: addressSchema,
});

export const bridgeUiConfigSchema = z.object({
  color: colorHexSchema,
  network: z.object({
    name: z.string().min(1),
    logo: z.string().optional(),
    description: descriptionSchema,
  }),
  nativeTokenData: z
    .object({
      name: z.string().min(1),
      symbol: z.string().min(1),
      decimals: z.number().int().positive(),
      logoUrl: z.string().optional(),
    })
    .optional(),
});

export const chainSchema = z
  .object({
    chainId: z.number().int().positive(),
    confirmPeriodBlocks: z.number().int().positive(),
    ethBridge: ethBridgeSchema,
    nativeToken: addressSchema.optional(),
    explorerUrl: urlSchema,
    rpcUrl: urlSchema,
    isArbitrum: z.boolean().default(true),
    isCustom: z.boolean().default(true),
    isTestnet: z.boolean(),
    name: z.string().min(1),
    slug: z.string().min(1),
    parentChainId: z.number().int().positive(),
    partnerChainIDs: z.array(z.number().int().positive()).default([]),
    retryableLifetimeSeconds: z.number().int().positive().default(604800),
    tokenBridge: tokenBridgeSchema,
    nitroGenesisBlock: z.number().int().nonnegative().default(0),
    nitroGenesisL1Block: z.number().int().nonnegative().default(0),
    depositTimeout: z.number().int().positive().default(1800000),
    blockTime: z.number().positive().default(0.25),
    bridgeUiConfig: bridgeUiConfigSchema,
  })
  .superRefine(async (chain, ctx) => {
    const getParentChainInfo = (parentChainId: number) => {
      switch (parentChainId) {
        case 1: // Ethereum Mainnet
          return {
            rpcUrl: "https://eth.llamarpc.com",
            blockExplorer: "https://etherscan.io",
            chainId: 1,
            name: "Ethereum",
          };
        case 42161: // Arbitrum One
          return {
            rpcUrl: "https://arb1.arbitrum.io/rpc",
            blockExplorer: "https://arbiscan.io",
            chainId: 42161,
            name: "Arbitrum One",
          };
        case 421614: // Arbitrum Sepolia
          return {
            rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
            blockExplorer: "https://sepolia.arbiscan.io",
            chainId: 421614,
            name: "Arbitrum Sepolia",
          };
        default:
          throw new Error(`Unsupported parent chain ID: ${parentChainId}`);
      }
    };

    const parentChainInfo = getParentChainInfo(chain.parentChainId);

    const parentAddressesToCheck = [
      chain.ethBridge.bridge,
      chain.ethBridge.inbox,
      chain.ethBridge.outbox,
      chain.ethBridge.rollup,
      chain.ethBridge.sequencerInbox,
      chain.tokenBridge.parentCustomGateway,
      chain.tokenBridge.parentErc20Gateway,
      chain.tokenBridge.parentGatewayRouter,
      chain.tokenBridge.parentMulticall,
      chain.tokenBridge.parentProxyAdmin,
      chain.tokenBridge.parentWeth,
      chain.tokenBridge.parentWethGateway,
    ].filter(
      (address): address is string =>
        typeof address === "string" &&
        address !== "0x0000000000000000000000000000000000000000"
    );

    const childAddressesToCheck = [
      chain.tokenBridge.childCustomGateway,
      chain.tokenBridge.childErc20Gateway,
      chain.tokenBridge.childGatewayRouter,
      chain.tokenBridge.childMulticall,
      chain.tokenBridge.childProxyAdmin,
    ].filter(
      (address): address is string =>
        typeof address === "string" &&
        address !== "0x0000000000000000000000000000000000000000"
    );

    const checkAddresses = async (
      addresses: string[],
      rpcUrl: string,
      blockExplorer: string,
      chainId: number,
      chainName: string
    ) => {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      for (const address of addresses) {
        try {
          const code = await provider.getCode(address);
          if (code === "0x") {
            const explorerLink = `${blockExplorer}/address/${address}`;
            console.warn(
              `Address ${address} on ${chainName} (chainId: ${chainId}) is not a contract. Verify manually: ${explorerLink}`
            );
            // TODO: Uncomment this when we can verify all contracts
            // ctx.addIssue({
            //   code: z.ZodIssueCode.custom,
            //   message: `Address at ${address} is not a contract on ${chainName}. Verify manually: ${explorerLink}`,
            // });
          }
        } catch (error) {
          const explorerLink = `${blockExplorer}/address/${address}`;
          console.log(
            `Error checking contract at ${address} on ${chainName} (chainId: ${chainId}). Verify manually: ${explorerLink}`
          );
          // ctx.addIssue({
          //   code: z.ZodIssueCode.custom,
          //   message: `Error checking contract at ${address} on ${chainName}. Verify manually: ${explorerLink}`,
          // });
        }
      }
    };

    chain.isTestnet = TESTNET_PARENT_CHAIN_IDS.includes(chain.parentChainId);

    await checkAddresses(
      parentAddressesToCheck,
      parentChainInfo.rpcUrl,
      parentChainInfo.blockExplorer,
      parentChainInfo.chainId,
      parentChainInfo.name
    );
    await checkAddresses(
      childAddressesToCheck,
      chain.rpcUrl,
      chain.explorerUrl,
      chain.chainId,
      chain.name
    );
  });

export type OrbitChainsList = {
  mainnet: OrbitChain[];
  testnet: OrbitChain[];
};

// Update the orbitChainsListSchema
export const orbitChainsListSchema = z.object({
  mainnet: z.array(chainSchema),
  testnet: z.array(chainSchema),
});

// Schema for incoming data from GitHub issue
export const incomingChainDataSchema = z.object({
  chainId: z.string().regex(/^\d+$/),
  name: z.string().min(1),
  description: z.string().max(130),
  chainLogo: z.string().url(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  rpcUrl: z.string().url(),
  explorerUrl: z.string().url(),
  parentChainId: z.string().regex(/^\d+$/),
  confirmPeriodBlocks: z.string().regex(/^\d+$/),
  nativeTokenAddress: addressSchema.optional(),
  nativeTokenName: z.string().optional(),
  nativeTokenSymbol: z.string().optional(),
  nativeTokenLogo: z.string().url().optional(),
  bridge: addressSchema,
  inbox: addressSchema,
  outbox: addressSchema,
  rollup: addressSchema,
  sequencerInbox: addressSchema,
  parentGatewayRouter: addressSchema,
  childGatewayRouter: addressSchema,
  parentErc20Gateway: addressSchema,
  childErc20Gateway: addressSchema,
  parentCustomGateway: addressSchema,
  childCustomGateway: addressSchema,
  parentWethGateway: addressSchema,
  childWethGateway: addressSchema,
  parentWeth: addressSchema,
  childWeth: addressSchema,
  parentProxyAdmin: addressSchema,
  childProxyAdmin: addressSchema,
  parentMulticall: addressSchema,
  childMulticall: addressSchema,
});

// Schema for the final OrbitChain structure
export const orbitChainSchema = chainSchema;

export const validateIncomingChainData = async (
  rawData: unknown
): Promise<IncomingChainData> => {
  try {
    return await incomingChainDataSchema.parseAsync(rawData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation errors:");
      error.errors.forEach((err) => {
        console.error(`${err.path.join(".")}: ${err.message}`);
      });
    }
    throw error;
  }
};

export const validateOrbitChain = async (chainData: unknown) => {
  return await chainSchema.parseAsync(chainData);
};

export const validateOrbitChainsList = async (
  chainsList: unknown
): Promise<void> => {
  try {
    await orbitChainsListSchema.parseAsync(chainsList);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("OrbitChainsList Validation Errors:");
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        console.error(`Path: ${path}`);
        console.error(`Error: ${err.message}`);
        if (err.code === z.ZodIssueCode.custom) {
          console.error(`Custom error: ${JSON.stringify(err.params)}`);
        }
        console.error("---");
      });
    }
    throw error;
  }
};

export const chainDataLabelToKey: Record<string, string> = {
  "Chain ID": "chainId",
  "Chain name": "name",
  "Chain description": "description",
  "Chain logo": "chainLogo",
  "Brand color": "color",
  "RPC URL": "rpcUrl",
  "Explorer URL": "explorerUrl",
  "Parent chain ID": "parentChainId",
  confirmPeriodBlocks: "confirmPeriodBlocks",
  "Native token address": "nativeTokenAddress",
  "Native token name": "nativeTokenName",
  "Native token symbol": "nativeTokenSymbol",
  "Native token logo": "nativeTokenLogo",
  bridge: "bridge",
  inbox: "inbox",
  outbox: "outbox",
  rollup: "rollup",
  sequencerInbox: "sequencerInbox",
  "Parent Gateway Router": "parentGatewayRouter",
  "Child Gateway Router": "childGatewayRouter",
  "Parent ERC20 Gateway": "parentErc20Gateway",
  "Child ERC20 Gateway": "childErc20Gateway",
  "Parent Custom Gateway": "parentCustomGateway",
  "Child Custom Gateway": "childCustomGateway",
  "Parent WETH Gateway": "parentWethGateway",
  "Child WETH Gateway": "childWethGateway",
  "Child WETH": "childWeth",
  "Parent Proxy Admin": "parentProxyAdmin",
  "Child Proxy Admin": "childProxyAdmin",
  "Parent MultiCall": "parentMulticall",
  "Child Multicall": "childMulticall",
  "Parent WETH": "parentWeth",
};

export interface Issue {
  state: string;
  body: string;
  html_url: string;
}

export type IncomingChainData = z.infer<typeof incomingChainDataSchema>;
export type TokenBridgeAddresses = z.infer<typeof tokenBridgeSchema>;
export type OrbitChain = z.infer<typeof chainSchema>;

export interface FieldMetadata {
  label: string;
  required: boolean;
  type: "string" | "number" | "address" | "url" | "color";
  validator?: (value: string) => boolean | string | number;
}

export type GithubClient = ReturnType<typeof getOctokit>;
