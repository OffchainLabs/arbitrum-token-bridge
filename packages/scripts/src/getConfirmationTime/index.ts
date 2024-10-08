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

async function calculateAverageBlockTime(
  provider: ethers.providers.JsonRpcProvider
): Promise<number> {
  const latestBlock = await provider.getBlock("latest");
  const oldBlock = await provider.getBlock(latestBlock.number - 1000);
  const timeDifference = latestBlock.timestamp - oldBlock.timestamp;
  const blockDifference = latestBlock.number - oldBlock.number;
  return timeDifference / blockDifference;
}

async function sampleNodeCreationTimes(
  rollupContract: ethers.Contract,
  sampleSize = 100
): Promise<number> {
  const samples: number[] = [];
  const latestNodeCreated = await rollupContract.latestNodeCreated();

  // Determine the maximum number of samples we can take
  const maxSamples = Math.min(
    sampleSize,
    Math.floor(latestNodeCreated.toNumber() / 100)
  );

  for (let i = 0; i < maxSamples; i++) {
    const endNodeNum = latestNodeCreated.sub(i * 100);
    const startNodeNum = latestNodeCreated.sub((i + 1) * 100);

    // Ensure we're not trying to access negative node numbers
    if (startNodeNum.lt(0)) {
      break;
    }

    const endNode = await rollupContract.getNode(endNodeNum);
    const startNode = await rollupContract.getNode(startNodeNum);
    const timeDiff = Number(BigInt(endNode[10]) - BigInt(startNode[10]));
    samples.push(timeDiff / 100);
  }

  // If we couldn't get any samples, throw an error
  if (samples.length === 0) {
    throw new Error(
      "Unable to sample node creation times: not enough historical data"
    );
  }

  // Calculate mean and standard deviation
  const mean = samples.reduce((a, b) => a + b) / samples.length;
  const variance =
    samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
    (samples.length - 1);
  const stdDev = Math.sqrt(variance);

  // Calculate 95% confidence interval
  const confidenceInterval = 1.96 * (stdDev / Math.sqrt(samples.length));

  console.log(`Mean node creation time: ${mean.toFixed(2)} blocks`);
  console.log(
    `95% Confidence Interval: ±${confidenceInterval.toFixed(2)} blocks`
  );
  console.log(`Number of samples: ${samples.length}`);

  return mean + confidenceInterval; // Return upper bound of confidence interval
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
      const averageCreationTime = await sampleNodeCreationTimes(rollupContract);
      summary.averageNodeCreationTime = BigInt(Math.round(averageCreationTime));

      const estimatedConfirmationTimeBlocks = averageCreationTime * 2;

      // Calculate average block time
      const averageBlockTime = await calculateAverageBlockTime(provider);
      console.log(`Average block time: ${averageBlockTime.toFixed(2)} seconds`);

      // Convert blocks to minutes
      const estimatedConfirmationTimeMinutes =
        (estimatedConfirmationTimeBlocks * averageBlockTime) / 60;

      console.log(
        `Estimated confirmation time: ${estimatedConfirmationTimeMinutes.toFixed(
          2
        )} minutes`
      );

      summary.estimatedConfirmationTime = Math.ceil(
        estimatedConfirmationTimeMinutes
      );

      // Update the orbitChainsData.json file
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

      // Fallback: use confirmPeriodBlocks and calculated average block time
      const averageBlockTime = await calculateAverageBlockTime(provider);
      const estimatedConfirmationTimeMinutes =
        (validatedChain.confirmPeriodBlocks * averageBlockTime) / 60;

      summary.estimatedConfirmationTime = Math.ceil(
        estimatedConfirmationTimeMinutes
      );

      // Update the orbitChainsData.json file with fallback value
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
      `  Estimated Confirmation Time: ${summary.estimatedConfirmationTime.toFixed(
        2
      )} minutes`
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
