import { ethers } from "ethers";
import {
  chainSchema,
  OrbitChain,
  OrbitChainsList,
} from "../addOrbitChain/schemas";
import orbitChainsData from "../../../arb-token-bridge-ui/src/util/orbitChainsData.json";
import {
  ParentChainInfo,
  ConfirmationTimeSummary,
  ROLLUP_ABI,
} from "./schemas";
import { updateOrbitChainsFile } from "../addOrbitChain/transforms";

const SAMPLE_SIZE = 100;
const NUMBER_OF_SAMPLES = 20;

async function calculateAverageBlockTime(
  provider: ethers.providers.JsonRpcProvider
): Promise<number> {
  const blockDifference = 1000;
  const latestBlock = await provider.getBlock("latest");
  const oldBlock = await provider.getBlock(
    latestBlock.number - blockDifference
  );
  const timeDifference = latestBlock.timestamp - oldBlock.timestamp;
  return timeDifference / blockDifference;
}

async function calculateEstimatedConfirmationBlocks(
  rollupContract: ethers.Contract,
  startBlock: number,
  endBlock: number
): Promise<number> {
  const t1 = await getNodeCreatedAtBlock(rollupContract, endBlock);
  const t2 = await getNodeCreatedAtBlock(rollupContract, startBlock);
  const blockRange = endBlock - startBlock;
  const averageCreationTime = calculateAverageCreationTime(t1, t2, blockRange);
  const eta = calculateEtaForConfirmation(averageCreationTime);
  console.log(
    `ETA for confirmation (range ${startBlock}-${endBlock}): ${eta} blocks`
  );
  return eta;
}

export async function calculateConfirmationTime(
  chainId: number
): Promise<number> {
  const summary: ConfirmationTimeSummary = {
    chainId,
    chainName: "",
    parentChainId: 0,
    averageNodeCreationTime: BigInt(0),
    estimatedConfirmationTime: 0,
    usedFallback: false,
  };

  try {
    const chainData = findChainById(
      chainId,
      orbitChainsData as OrbitChainsList
    );
    if (!chainData) {
      throw new Error(`Chain with ID ${chainId} not found in orbitChainsData`);
    }

    const validatedChain = await chainSchema.parseAsync(chainData);
    const parentChainInfo = getParentChainInfo(validatedChain.parentChainId);

    summary.chainName = validatedChain.name;
    summary.parentChainId = validatedChain.parentChainId;

    const provider = new ethers.providers.JsonRpcProvider(
      parentChainInfo.rpcUrl
    );
    const rollupContract = new ethers.Contract(
      validatedChain.ethBridge.rollup,
      ROLLUP_ABI,
      provider
    );

    try {
      const averageBlockTime = await calculateAverageBlockTime(provider);
      console.log(`Average block time: ${averageBlockTime.toFixed(2)} seconds`);

      // Old method: calculate estimated confirmation time blocks
      const latestNode = await getLatestNodeCreated(rollupContract);
      const oldEstimatedConfirmationTimeBlocks =
        await calculateEstimatedConfirmationBlocks(
          rollupContract,
          Math.max(0, latestNode - SAMPLE_SIZE),
          latestNode
        );

      // New method: perform analysis with 10 samples
      const newEstimatedConfirmationTimeBlocks =
        await analyzeNodeCreationSamples(rollupContract, NUMBER_OF_SAMPLES);

      const oldEstimatedConfirmationTimeSeconds = Math.round(
        oldEstimatedConfirmationTimeBlocks * averageBlockTime
      );
      const newEstimatedConfirmationTimeSeconds = Math.round(
        newEstimatedConfirmationTimeBlocks * averageBlockTime
      );

      console.log(
        `Old Estimated confirmation time: ${oldEstimatedConfirmationTimeBlocks} blocks (${oldEstimatedConfirmationTimeSeconds} seconds)`
      );
      console.log(
        `New Estimated confirmation time: ${newEstimatedConfirmationTimeBlocks} blocks (${newEstimatedConfirmationTimeSeconds} seconds)`
      );
      console.log(
        `Difference: ${Math.abs(
          oldEstimatedConfirmationTimeBlocks -
            newEstimatedConfirmationTimeBlocks
        )} blocks (${Math.abs(
          oldEstimatedConfirmationTimeSeconds -
            newEstimatedConfirmationTimeSeconds
        )} seconds)`
      );

      // For now, we'll use the old method for consistency, but you can change this if needed
      summary.estimatedConfirmationTime = oldEstimatedConfirmationTimeSeconds;

      const updatedChain = {
        ...validatedChain,
        estimatedConfirmationTime: summary.estimatedConfirmationTime,
      };
      const targetJsonPath =
        "../arb-token-bridge-ui/src/util/orbitChainsData.json";
      updateOrbitChainsFile(updatedChain, targetJsonPath);

      return summary.estimatedConfirmationTime;
    } catch (error) {
      console.warn(
        `Failed to calculate confirmation time using contract data for chain ${chainId}. Falling back to confirmPeriodBlocks.`
      );
      console.log(error);
      summary.usedFallback = true;

      const averageBlockTime = await calculateAverageBlockTime(provider);
      summary.estimatedConfirmationTime = Math.round(
        validatedChain.confirmPeriodBlocks * averageBlockTime
      );

      const updatedChain = {
        ...validatedChain,
        estimatedConfirmationTime: summary.estimatedConfirmationTime,
      };
      const targetJsonPath =
        "../arb-token-bridge-ui/src/util/orbitChainsData.json";
      updateOrbitChainsFile(updatedChain, targetJsonPath);

      return summary.estimatedConfirmationTime;
    }
  } catch (error) {
    console.error(
      `Error calculating confirmation time for chain ${chainId}:`,
      error
    );
    throw error;
  } finally {
    console.log(`Chain ${chainId} (${summary.chainName}):`);
    console.log(
      `  Estimated Confirmation Time: ${summary.estimatedConfirmationTime} seconds`
    );
    console.log(`  Used Fallback: ${summary.usedFallback}`);
  }
}

function findChainById(
  chainId: number,
  chainsList: OrbitChainsList
): OrbitChain | undefined {
  const allChains = [...chainsList.mainnet, ...chainsList.testnet];
  return allChains.find((chain) => chain.chainId === chainId);
}

export function getOrbitChainIds(): number[] {
  const allChains = [...orbitChainsData.mainnet, ...orbitChainsData.testnet];
  return allChains.map((chain) => chain.chainId);
}

function getParentChainInfo(parentChainId: number): ParentChainInfo {
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
    case 11155111: // Sepolia
      return {
        rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
        blockExplorer: "https://sepolia.etherscan.io",
        chainId: 11155111,
        name: "Sepolia",
      };
    case 421614: // Arbitrum Sepolia
      return {
        rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
        blockExplorer: "https://sepolia.arbiscan.io",
        chainId: 421614,
        name: "Arbitrum Sepolia",
      };
    case 17000: // Holesky
      return {
        rpcUrl: "https://ethereum-holesky-rpc.publicnode.com",
        blockExplorer: "https://holesky.etherscan.io/",
        chainId: 17000,
        name: "Holesky",
      };
    default:
      throw new Error(`Unsupported parent chain ID: ${parentChainId}`);
  }
}

export async function updateAllConfirmationTimes(): Promise<void> {
  const chainIds = getOrbitChainIds();
  for (const chainId of chainIds) {
    try {
      await calculateConfirmationTime(chainId);
    } catch (error) {
      console.error(
        `Failed to update confirmation time for chain ${chainId}:`,
        error
      );
    }
  }
}

async function getLatestNodeCreated(
  rollupContract: ethers.Contract
): Promise<number> {
  return await rollupContract.latestNodeCreated();
}

async function getNodeCreatedAtBlock(
  rollupContract: ethers.Contract,
  nodeId: number
): Promise<number> {
  const node = await rollupContract.getNode(nodeId);
  return node.createdAtBlock;
}

function calculateAverageCreationTime(
  t1: number,
  t2: number,
  range: number
): number {
  return (t1 - t2) / range;
}

function calculateEtaForConfirmation(averageCreationTime: number): number {
  return 2 * averageCreationTime;
}

export async function analyzeNodeCreationSamples(
  rollupContract: ethers.Contract,
  numberOfSamples: number
): Promise<number> {
  console.log(
    `Analyzing ${numberOfSamples} samples for node creation times...`
  );
  const samples: number[] = [];

  const latestNode = await getLatestNodeCreated(rollupContract);
  let currentEndNode = latestNode;

  for (let i = 0; i < numberOfSamples; i++) {
    const startNode = Math.max(0, currentEndNode - SAMPLE_SIZE);
    if (startNode === currentEndNode) {
      console.log(
        `Reached the earliest node, stopping sampling at ${i} samples.`
      );
      break;
    }
    const eta = await calculateEstimatedConfirmationBlocks(
      rollupContract,
      startNode,
      currentEndNode
    );
    samples.push(eta);
    currentEndNode = startNode;
  }

  const mean = samples.reduce((a, b) => a + b) / samples.length;
  const variance =
    samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
    (samples.length - 1);
  const stdDev = Math.sqrt(variance);

  console.log(`Mean ETA for confirmation: ${mean.toFixed(2)} blocks`);
  console.log(`Variance: ${variance.toFixed(2)}`);
  console.log(`Standard Deviation: ${stdDev.toFixed(2)}`);
  console.log(`Number of samples: ${samples.length}`);

  return Math.round(mean);
}
