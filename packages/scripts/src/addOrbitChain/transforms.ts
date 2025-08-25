/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import * as core from "@actions/core";
import { getArbitrumNetworkInformationFromRollup } from "@arbitrum/sdk";
import axios from "axios";
import { fileTypeFromBuffer } from "file-type";
import * as fs from "fs";
import path from "path";
import sharp from "sharp";
import { lookup } from "mime-types";
import { getIssue } from "./github";
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
} from "./schemas";
import { getProvider } from "./provider";
import { ethers } from "ethers";

const SUPPORTED_IMAGE_EXTENSIONS = ["png", "svg", "jpg", "jpeg", "webp"];
const MAX_IMAGE_SIZE_KB = 100;
const ZERO_ADDRESS = ethers.constants.AddressZero;

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
    validatedIncomingData.name
  )}`;
  console.log(`Branch name generated: ${branchName}`);

  console.log("Chain data processing completed successfully");
  core.endGroup();
  return { branchName, validatedIncomingData };
};

export const handleImages = async (
  branchName: string,
  validatedIncomingData: IncomingChainData
): Promise<{ chainLogoPath: string; nativeTokenLogoPath?: string }> => {
  core.startGroup("Image Processing");
  console.log("Starting image processing...");
  console.log(
    `Fetching and saving chain logo: ${validatedIncomingData.chainLogo}`
  );
  const chainLogoPath = await fetchAndSaveImage(
    validatedIncomingData.chainLogo,
    `${stripWhitespace(validatedIncomingData.name)}_Logo`
  );
  console.log(`Chain logo saved at: ${chainLogoPath}`);

  let nativeTokenLogoPath: string | undefined;
  if (
    validatedIncomingData.nativeTokenAddress &&
    validatedIncomingData.nativeTokenLogo
  ) {
    console.log(
      `Fetching and saving native token logo: ${validatedIncomingData.nativeTokenLogo}`
    );
    nativeTokenLogoPath =
      validatedIncomingData.chainLogo === validatedIncomingData.nativeTokenLogo
        ? chainLogoPath
        : await fetchAndSaveImage(
            validatedIncomingData.nativeTokenLogo,
            `${stripWhitespace(validatedIncomingData.name)}_NativeTokenLogo`
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
  nativeTokenLogoPath?: string
) => {
  core.startGroup("Orbit Chain Creation and Validation");
  console.log("Creating OrbitChain object...");
  const orbitChain = await transformIncomingDataToOrbitChain(
    validatedIncomingData,
    chainLogoPath,
    nativeTokenLogoPath
  );
  console.log("Orbit Chain object created, validating...");
  await validateOrbitChain(orbitChain);
  console.log("Orbit Chain validated successfully");
  core.endGroup();
  return orbitChain;
};

export const updateOrbitChainsList = async (
  orbitChain: OrbitChain,
  targetJsonPath: string
) => {
  core.startGroup("Orbit ChainsList Update and Validation");
  console.log("Updating OrbitChainsList...");
  const networkType = orbitChain.isTestnet ? "testnet" : "mainnet";
  console.log(`Network type determined: ${networkType}`);
  const updatedOrbitChainsList = updateOrbitChainsFile(
    orbitChain,
    targetJsonPath
  );
  console.log("Validating new Orbit chain...");
  await validateOrbitChain(orbitChain);
  console.log("Orbit Chain validated successfully");
  core.endGroup();
  return updatedOrbitChainsList;
};

export const extractImageUrlFromMarkdown = (
  markdown: string
): string | null => {
  // Match markdown image syntax: ![alt text](url)
  const markdownMatch = markdown.match(/!\[.*?\]\((.*?)\)/);
  if (markdownMatch && markdownMatch[1]) {
    return markdownMatch[1];
  }

  // Match HTML img tag syntax: <img ... src="url" ... />
  const htmlMatch = markdown.match(
    /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*\/?>/
  );
  if (htmlMatch && htmlMatch[1]) {
    return htmlMatch[1];
  }

  return markdown;
};

export const extractRawChainData = (
  issue: Issue
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
      if (key === "chainLogo" || key === "nativeTokenLogo") {
        const imageUrl = extractImageUrlFromMarkdown(trimmedValue);
        rawData[key] = imageUrl || trimmedValue;
      } else if (key === "fastWithdrawalActive") {
        rawData[key] = trimmedValue === "Yes";
      } else {
        rawData[key] = trimmedValue;
      }
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
  maxSizeKB = MAX_IMAGE_SIZE_KB
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
  urlOrPath: string
): Promise<{ buffer: Buffer; fileExtension: string }> => {
  let imageBuffer: Buffer;
  let fileExtension: string;

  if (urlOrPath.startsWith("http")) {
    console.log("Fetching image from:", urlOrPath);

    const response = await axios.get(urlOrPath, {
      responseType: "arraybuffer",
      timeout: 10000, // 10 seconds timeout
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch image. Status: ${response.status}`);
    }

    imageBuffer = Buffer.from(response.data);

    const isSVG =
      response.headers["content-type"]?.includes("svg") ||
      imageBuffer.toString("utf8").trim().toLowerCase().startsWith("<svg") ||
      imageBuffer
        .toString("utf8")
        .includes('xmlns="http://www.w3.org/2000/svg"');

    if (isSVG) {
      fileExtension = ".svg";
    } else {
      // Try to determine file extension from response headers
      fileExtension = lookup(response.headers["content-type"] as string) || "";
      if (!fileExtension) {
        // If not found in headers, try to determine from the image data
        const detectedType = await fileTypeFromBuffer(imageBuffer);
        fileExtension = detectedType ? `.${detectedType.ext}` : "";
      }
    }
  } else {
    // Handle local paths
    const localPath = `../../arb-token-bridge-ui/public/${urlOrPath}`;
    if (!fs.existsSync(localPath)) {
      throw new Error(
        `Provided local path '${localPath}' did not match any existing images.`
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

  // we don't need to convert or resize SVGs
  if (fileExtension === ".svg") {
    return { buffer: imageBuffer, fileExtension };
  }

  if (!SUPPORTED_IMAGE_EXTENSIONS.includes(fileExtension.replace(".", ""))) {
    console.warn(
      `Unsupported image extension '${fileExtension}'. Converting to WEBP.`
    );

    // Convert the image to .webp using sharp
    imageBuffer = await sharp(imageBuffer).webp().toBuffer();
    fileExtension = ".webp";
  }

  // Resize the image (only for non-SVG)
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
  fileName: string
): Promise<string> => {
  const { buffer, fileExtension } = await fetchAndProcessImage(urlOrPath);
  const imageSavePath = `images/${fileName}${fileExtension}`;

  const fullPath = path.join(
    process.cwd(),
    "../../packages/arb-token-bridge-ui/public/images"
  );

  // Save the file locally
  fs.writeFileSync(path.join(fullPath, `${fileName}${fileExtension}`), buffer);
  console.log(`Successfully saved image to ${imageSavePath}`);

  return `/${imageSavePath}`;
};

export const transformIncomingDataToOrbitChain = async (
  chainData: IncomingChainData,
  chainLogoPath: string,
  nativeTokenLogoPath?: string
): Promise<OrbitChain> => {
  const parentChainId = parseInt(chainData.parentChainId, 10);
  const isTestnet = TESTNET_PARENT_CHAIN_IDS.includes(parentChainId);
  const parentChainInfo = getParentChainInfo(parentChainId);
  const provider = getProvider(parentChainInfo);
  const rollupData = await getArbitrumNetworkInformationFromRollup(
    chainData.rollup,
    provider
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
      parentProxyAdmin: ZERO_ADDRESS,
      parentWeth: chainData.parentWeth,
      parentWethGateway: chainData.parentWethGateway,
      childCustomGateway: chainData.childCustomGateway,
      childErc20Gateway: chainData.childErc20Gateway,
      childGatewayRouter: chainData.childGatewayRouter,
      childMultiCall: chainData.childMultiCall,
      childProxyAdmin: ZERO_ADDRESS,
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
          logoUrl: nativeTokenLogoPath,
        },
      }),
      ...(chainData.fastWithdrawalActive && {
        fastWithdrawalTime: chainData.fastWithdrawalMinutes
          ? Number(chainData.fastWithdrawalMinutes) * 60 * 1000
          : undefined,
      }),
    },
  };
};

export const updateOrbitChainsFile = (
  orbitChain: OrbitChain,
  targetJsonPath: string
): OrbitChainsList => {
  // Read the file contents
  const fileContents = fs.readFileSync(targetJsonPath, "utf8");

  // Parse the JSON
  const orbitChains: { mainnet: OrbitChain[]; testnet: OrbitChain[] } =
    JSON.parse(fileContents);
  const networkType = orbitChain.isTestnet ? "testnet" : "mainnet";

  // Find the index of the chain if it already exists
  const existingIndex = orbitChains[networkType].findIndex(
    (chain) => chain.chainId === orbitChain.chainId
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
