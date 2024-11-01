/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import * as core from "@actions/core";
import { warning } from "@actions/core";
import { getArbitrumNetworkInformationFromRollup } from "@arbitrum/sdk";
import axios from "axios";
import { fileTypeFromBuffer } from "file-type";
import * as fs from "fs";
import path from "path";
import sharp from "sharp";
import { lookup } from "mime-types";
import {
  commitChanges,
  createBranch,
  createPullRequest,
  getIssue,
  saveImageToGitHub,
} from "./github";
import {
  chainDataLabelToKey,
  getParentChainInfo,
  IncomingChainData,
  Issue,
  OrbitChain,
  OrbitChainsList,
  TESTNET_PARENT_CHAIN_IDS,
  validateIncomingChainData,
  validateOrbitChain,
  validateOrbitChainsList,
} from "./schemas";
import { getProvider } from "./provider";

const SUPPORTED_IMAGE_EXTENSIONS = ["png", "svg", "jpg", "jpeg", "webp"];
const MAX_IMAGE_SIZE_KB = 100;

export const getFileExtension = (mimeType: string): string => {
  const extension = lookup(mimeType);
  return extension ? `.${extension}` : "";
};

export const initializeAndFetchData = async (): Promise<void> => {
  core.startGroup("Initialization and Data Fetching");
  console.log("Starting initialization and data fetching...");
  const issueNumber = process.env.ISSUE_NUMBER;
  if (!issueNumber) {
    throw new Error("ISSUE_NUMBER environment variable is not set");
  }
  console.log(`Fetching issue #${issueNumber}`);
  const issue = await getIssue(issueNumber);
  console.log("Extracting raw chain data from issue");
  const rawChainData = extractRawChainData(issue);
  console.log("Validating incoming chain data");
  await validateIncomingChainData(rawChainData);
  console.log("Initialization and data fetching completed successfully");
  core.endGroup();
};

export const processChainData = async (): Promise<{
  branchName: string;
  validatedIncomingData: IncomingChainData;
}> => {
  core.startGroup("Chain Data Processing");
  console.log("Starting chain data processing...");
  const issue = await getIssue(process.env.ISSUE_NUMBER!);
  console.log("Extracting raw chain data from issue");
  const rawChainData = extractRawChainData(issue);
  console.log("Validating incoming chain data");
  const validatedIncomingData = await validateIncomingChainData(rawChainData);

  const branchName = `add-orbit-chain/${stripWhitespace(
    validatedIncomingData.name,
  )}`;
  console.log(`Creating new branch: ${branchName}`);
  await createBranch(branchName);

  console.log("Chain data processing completed successfully");
  core.endGroup();
  return { branchName, validatedIncomingData };
};

export const handleImages = async (
  branchName: string,
  validatedIncomingData: IncomingChainData,
): Promise<{ chainLogoPath: string; nativeTokenLogoPath?: string }> => {
  core.startGroup("Image Processing");
  console.log("Starting image processing...");
  console.log(
    `Fetching and saving chain logo: ${validatedIncomingData.chainLogo}`,
  );
  const chainLogoPath = await fetchAndSaveImage(
    validatedIncomingData.chainLogo,
    `${stripWhitespace(validatedIncomingData.name)}_Logo`,
    branchName,
  );
  console.log(`Chain logo saved at: ${chainLogoPath}`);

  let nativeTokenLogoPath: string | undefined;
  if (
    validatedIncomingData.nativeTokenAddress &&
    validatedIncomingData.nativeTokenLogo
  ) {
    console.log(
      `Fetching and saving native token logo: ${validatedIncomingData.nativeTokenLogo}`,
    );
    nativeTokenLogoPath =
      validatedIncomingData.chainLogo === validatedIncomingData.nativeTokenLogo
        ? chainLogoPath
        : await fetchAndSaveImage(
            validatedIncomingData.nativeTokenLogo,
            `${stripWhitespace(validatedIncomingData.name)}_NativeTokenLogo`,
            branchName,
          );
    console.log(`Native token logo saved at: ${nativeTokenLogoPath}`);
  } else {
    console.log("No native token logo to process");
  }
  console.log("Image processing completed successfully");
  core.endGroup();
  return { chainLogoPath, nativeTokenLogoPath };
};

export const createAndValidateOrbitChain = async (
  validatedIncomingData: IncomingChainData,
  chainLogoPath: string,
  nativeTokenLogoPath?: string,
) => {
  core.startGroup("Orbit Chain Creation and Validation");
  console.log("Creating OrbitChain object...");
  const orbitChain = await transformIncomingDataToOrbitChain(
    validatedIncomingData,
    chainLogoPath,
    nativeTokenLogoPath,
  );
  console.log("Orbit Chain object created, validating...");
  await validateOrbitChain(orbitChain);
  console.log("Orbit Chain validated successfully");
  core.endGroup();
  return orbitChain;
};

export const updateAndValidateOrbitChainsList = async (
  orbitChain: OrbitChain,
  targetJsonPath: string,
) => {
  core.startGroup("Orbit ChainsList Update and Validation");
  console.log("Updating OrbitChainsList...");
  const networkType = orbitChain.isTestnet ? "testnet" : "mainnet";
  console.log(`Network type determined: ${networkType}`);
  const updatedOrbitChainsList = updateOrbitChainsFile(
    orbitChain,
    targetJsonPath,
  );
  console.log("Orbit ChainsList updated, validating...");
  await validateOrbitChainsList(updatedOrbitChainsList);
  console.log("Orbit ChainsList validated successfully");
  core.endGroup();
  return updatedOrbitChainsList;
};

export const commitChangesAndCreatePR = async (
  branchName: string,
  targetJsonPath: string,
  updatedOrbitChainsList: ReturnType<typeof updateOrbitChainsFile>,
  orbitChain: OrbitChain,
) => {
  core.startGroup("Commit Changes and Create Pull Request");
  console.log("Preparing to commit changes...");
  const repoRelativePath = targetJsonPath.replace(/^\.\.\/\.\.\//, "");
  console.log(`Repo relative path: ${repoRelativePath}`);
  const fileContents = JSON.stringify(updatedOrbitChainsList, null, 2);
  console.log("Committing changes...");
  await commitChanges(branchName, repoRelativePath, fileContents);
  console.log("Changes committed successfully");
  const issue = await getIssue(process.env.ISSUE_NUMBER!);
  console.log("Creating pull request...");
  await createPullRequest(branchName, orbitChain.name, issue.html_url)
    .catch((err) => {
      if (err.message.includes("A pull request already exists")) {
        console.log("Pull request already exists.");
      } else {
        throw err;
      }
    })
    .then(() => {
      console.log("Pull request created successfully");
    });
  core.endGroup();
};

export const setOutputs = (
  branchName: string,
  orbitChain: OrbitChain,
  targetJsonPath: string,
) => {
  core.startGroup("Set Outputs");
  console.log("Setting output values...");
  const repoRelativePath = targetJsonPath.replace(/^\.\.\/\.\.\//, "");
  core.setOutput("branch_name", branchName);
  console.log(`Set output - branch_name: ${branchName}`);
  core.setOutput(
    "issue_url",
    getIssue(process.env.ISSUE_NUMBER!).then((issue) => issue.html_url),
  );
  console.log("Set output - issue_url (promise)");
  core.setOutput("orbit_list_path", repoRelativePath);
  console.log(`Set output - orbit_list_path: ${repoRelativePath}`);
  core.setOutput("chain_name", orbitChain.name);
  console.log(`Set output - chain_name: ${orbitChain.name}`);
  console.log("All outputs set successfully");
  core.endGroup();
};

export const extractRawChainData = (
  issue: Issue,
): Record<string, string | boolean | undefined> => {
  const pattern = /###\s*(.*?)\s*\n\s*([\s\S]*?)(?=###|$)/g;
  const rawData: Record<string, string | boolean | undefined> = {};
  let match;

  while ((match = pattern.exec(issue.body)) !== null) {
    const [, label, value] = match;
    const trimmedLabel = label.trim();
    const trimmedValue = value.trim();

    const key = chainDataLabelToKey[trimmedLabel] || trimmedLabel;

    if (trimmedValue !== "_No response_") {
      rawData[key] = trimmedValue;
    }
  }

  return rawData;
};

export const stripWhitespace = (text: string): string =>
  text.replace(/\s+/g, "");
export const nameToSlug = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, "-");

export const resizeImage = async (
  imageBuffer: Buffer,
  maxSizeKB = MAX_IMAGE_SIZE_KB,
): Promise<Buffer> => {
  console.log("Resizing image...");
  let resizedImage = imageBuffer;
  let scale = 1;

  while (resizedImage.length > maxSizeKB * 1024 && scale > 0.1) {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Unable to get image dimensions");
    }

    const newWidth = Math.round(metadata.width * scale);
    const newHeight = Math.round(metadata.height * scale);

    resizedImage = await image
      .resize(newWidth, newHeight, { fit: "inside" })
      .toBuffer();

    scale -= 0.1;
  }

  if (resizedImage.length > maxSizeKB * 1024) {
    throw new Error(`Unable to resize image to under ${maxSizeKB}KB`);
  }

  return resizedImage;
};

export const fetchAndProcessImage = async (
  urlOrPath: string,
): Promise<{ buffer: Buffer; fileExtension: string }> => {
  let imageBuffer: Buffer;
  let fileExtension: string;

  // Check if the URL is an IPFS URL or starts with http/https
  if (urlOrPath.startsWith("ipfs://") || urlOrPath.startsWith("http")) {
    // Handle remote URLs (including IPFS)
    if (urlOrPath.startsWith("ipfs://")) {
      urlOrPath = `https://ipfs.io/ipfs/${urlOrPath.slice(7)}`;
    }

    console.log("Fetching image from:", urlOrPath);

    const response = await axios.get(urlOrPath, {
      responseType: "arraybuffer",
      timeout: 10000, // 10 seconds timeout
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch image. Status: ${response.status}`);
    }

    imageBuffer = Buffer.from(response.data);

    // Try to determine file extension from response headers
    fileExtension = lookup(response.headers["content-type"] as string) || "";
    if (!fileExtension) {
      // If not found in headers, try to determine from the image data
      const detectedType = await fileTypeFromBuffer(imageBuffer);
      fileExtension = detectedType ? `.${detectedType.ext}` : "";
    }
  } else {
    // Handle local paths
    const localPath = `../../arb-token-bridge-ui/public/${urlOrPath}`;
    if (!fs.existsSync(localPath)) {
      throw new Error(
        `Provided local path '${localPath}' did not match any existing images.`,
      );
    }
    imageBuffer = fs.readFileSync(localPath);
    fileExtension = path.extname(localPath);
  }

  // If still not found, default to .webp
  if (!fileExtension) {
    console.warn("Could not determine file type, defaulting to .webp");
    fileExtension = ".webp";
  }

  if (!SUPPORTED_IMAGE_EXTENSIONS.includes(fileExtension.replace(".", ""))) {
    console.warn(
      `Unsupported image extension '${fileExtension}'. Converting to WEBP.`,
    );

    // Convert the image to .webp using sharp
    imageBuffer = await sharp(imageBuffer).webp().toBuffer();
    fileExtension = ".webp";
  }

  // Resize the image
  try {
    imageBuffer = await resizeImage(imageBuffer);
  } catch (error) {
    if (error instanceof Error) {
      console.warn(`Failed to resize image: ${error.message}`);
    } else {
      console.warn(`Failed to resize image: ${error}`);
    }
  }

  return { buffer: imageBuffer, fileExtension };
};

export const fetchAndSaveImage = async (
  urlOrPath: string,
  fileName: string,
  branchName: string,
): Promise<string> => {
  const { buffer, fileExtension } = await fetchAndProcessImage(urlOrPath);
  const imageSavePath = `images/${fileName}${fileExtension}`;
  await saveImageToGitHub(branchName, imageSavePath, buffer);
  return `/${imageSavePath}`;
};

export const transformIncomingDataToOrbitChain = async (
  chainData: IncomingChainData,
  chainLogoPath: string,
  nativeTokenLogoPath?: string,
): Promise<OrbitChain> => {
  const parentChainId = parseInt(chainData.parentChainId, 10);
  const isTestnet = TESTNET_PARENT_CHAIN_IDS.includes(parentChainId);
  const parentChainInfo = getParentChainInfo(parentChainId);
  const provider = getProvider(parentChainInfo);
  const rollupData = await getArbitrumNetworkInformationFromRollup(
    chainData.rollup,
    provider,
  );

  return {
    chainId: parseInt(chainData.chainId, 10),
    confirmPeriodBlocks: rollupData.confirmPeriodBlocks,
    ethBridge: {
      bridge: rollupData.ethBridge.bridge,
      inbox: rollupData.ethBridge.inbox,
      outbox: rollupData.ethBridge.outbox,
      rollup: chainData.rollup,
      sequencerInbox: rollupData.ethBridge.sequencerInbox,
    },
    nativeToken: chainData.nativeTokenAddress,
    explorerUrl: chainData.explorerUrl,
    rpcUrl: chainData.rpcUrl,
    isCustom: true,
    isTestnet,
    name: chainData.name,
    slug: nameToSlug(chainData.name),
    parentChainId,
    tokenBridge: {
      parentCustomGateway: chainData.parentCustomGateway,
      parentErc20Gateway: chainData.parentErc20Gateway,
      parentGatewayRouter: chainData.parentGatewayRouter,
      parentMultiCall: chainData.parentMultiCall,
      parentProxyAdmin: chainData.parentProxyAdmin,
      parentWeth: chainData.parentWeth,
      parentWethGateway: chainData.parentWethGateway,
      childCustomGateway: chainData.childCustomGateway,
      childErc20Gateway: chainData.childErc20Gateway,
      childGatewayRouter: chainData.childGatewayRouter,
      childMultiCall: chainData.childMultiCall,
      childProxyAdmin: chainData.childProxyAdmin,
      childWeth: chainData.childWeth,
      childWethGateway: chainData.childWethGateway,
    },
    bridgeUiConfig: {
      color: chainData.color,
      network: {
        name: chainData.name,
        logo: chainLogoPath,
        description: chainData.description,
      },
      ...(chainData.nativeTokenAddress && {
        nativeTokenData: {
          name: chainData.nativeTokenName || "",
          symbol: chainData.nativeTokenSymbol || "",
          decimals: 18,
          logoUrl: nativeTokenLogoPath,
        },
      }),
    },
  };
};

export const updateOrbitChainsFile = (
  orbitChain: OrbitChain,
  targetJsonPath: string,
): OrbitChainsList => {
  // Read the file contents
  const fileContents = fs.readFileSync(targetJsonPath, "utf8");

  // Parse the JSON
  const orbitChains: { mainnet: OrbitChain[]; testnet: OrbitChain[] } =
    JSON.parse(fileContents);
  const networkType = orbitChain.isTestnet ? "testnet" : "mainnet";

  // Find the index of the chain if it already exists
  const existingIndex = orbitChains[networkType].findIndex(
    (chain) => chain.chainId === orbitChain.chainId,
  );

  if (existingIndex !== -1) {
    // Update existing chain
    orbitChains[networkType][existingIndex] = orbitChain;
  } else {
    // Add new chain to the end of the array
    orbitChains[networkType].push(orbitChain);
  }

  // Convert the updated object back to a JSON string, preserving the original formatting
  const updatedContents = JSON.stringify(orbitChains, null, 2);

  // Write the updated contents back to the file
  fs.writeFileSync(targetJsonPath, updatedContents);

  return orbitChains;
};

export async function runPrettier(targetJsonPath: string): Promise<void> {
  try {
    const fileContent = fs.readFileSync(targetJsonPath, "utf8");

    const prettier = await import("prettier");
    const config = await import(
      "../../../arb-token-bridge-ui/prettier.config.js"
    );

    const formattedContent = await prettier.format(fileContent, {
      tabWidth: 2,
      singleQuote: false,
    });
    const formattedContent2 = await prettier.format(fileContent, {
      ...config,
      filepath: targetJsonPath,
    });
    console.log({ formattedContent2 });
    fs.writeFileSync(targetJsonPath, formattedContent);
    console.log(`Prettier formatting applied to ${targetJsonPath}`);
  } catch (error) {
    warning(`Failed to run Prettier: ${error}`);
  }
}
