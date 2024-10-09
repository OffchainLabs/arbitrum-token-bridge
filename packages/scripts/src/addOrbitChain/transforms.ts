/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import * as core from "@actions/core";
import { warning } from "@actions/core";
import axios from "axios";
import * as fs from "fs";

import {
  commitChanges,
  createBranch,
  createPullRequest,
  getContent,
  getIssue,
  updateContent,
} from "./github";
import { fetchRollupContractData } from "./network";
import {
  chainDataLabelToKey,
  IncomingChainData,
  Issue,
  OrbitChain,
  OrbitChainsList,
  TESTNET_PARENT_CHAIN_IDS,
  validateIncomingChainData,
  validateOrbitChain,
  validateOrbitChainsList,
} from "./schemas";

const SUPPORTED_IMAGE_EXTENSIONS = ["png", "svg", "jpg", "jpeg", "webp"];

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
  console.log(`Creating new branch: ${branchName}`);
  await createBranch(branchName);

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
    `${stripWhitespace(validatedIncomingData.name)}_Logo`,
    branchName
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
            `${stripWhitespace(validatedIncomingData.name)}_NativeTokenLogo`,
            branchName
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
  const orbitChain = transformIncomingDataToOrbitChain(
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

export const updateAndValidateOrbitChainsList = async (
  orbitChain: ReturnType<typeof transformIncomingDataToOrbitChain>,
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
  orbitChain: ReturnType<typeof transformIncomingDataToOrbitChain>
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
  await createPullRequest(branchName, orbitChain.name, issue.html_url);
  console.log("Pull request created successfully");
  core.endGroup();
};

export const setOutputs = (
  branchName: string,
  orbitChain: ReturnType<typeof transformIncomingDataToOrbitChain>,
  targetJsonPath: string
) => {
  core.startGroup("Set Outputs");
  console.log("Setting output values...");
  const repoRelativePath = targetJsonPath.replace(/^\.\.\/\.\.\//, "");
  core.setOutput("branch_name", branchName);
  console.log(`Set output - branch_name: ${branchName}`);
  core.setOutput(
    "issue_url",
    getIssue(process.env.ISSUE_NUMBER!).then((issue) => issue.html_url)
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
      rawData[key] = trimmedValue;
    }
  }

  return rawData;
};

export const stripWhitespace = (text: string): string =>
  text.replace(/\s+/g, "");
export const nameToSlug = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, "-");

export const fetchAndSaveImage = async (
  urlOrPath: string,
  fileName: string,
  branchName: string
): Promise<string> => {
  const isLocalPath = !urlOrPath.startsWith("http");
  if (isLocalPath) {
    const localPath = `../../arb-token-bridge-ui/public/${urlOrPath}`;
    if (!fs.existsSync(localPath)) {
      throw new Error(
        `Provided local path '${localPath}' did not match any existing images.`
      );
    }
    return urlOrPath;
  }

  const fileExtension = urlOrPath.split(".").pop()?.split("?")[0] || "";
  if (!SUPPORTED_IMAGE_EXTENSIONS.includes(fileExtension)) {
    throw new Error(
      `Invalid image extension '${fileExtension}'. Expected: ${SUPPORTED_IMAGE_EXTENSIONS.join(
        ", "
      )}.`
    );
  }

  const imageSavePath = `images/${fileName}.${fileExtension}`;
  const fullSavePath = `../../arb-token-bridge-ui/public/${imageSavePath}`;

  // Create directories if they don't exist
  const dirs = fullSavePath.split("/").slice(0, -1).join("/");
  if (!fs.existsSync(dirs)) {
    fs.mkdirSync(dirs, { recursive: true });
  }

  if (fs.existsSync(fullSavePath)) {
    warning(
      `${fileName} already exists at '${imageSavePath}'. Using the existing image.`
    );
    return `/${imageSavePath}`;
  }

  const response = await axios.get(urlOrPath, { responseType: "arraybuffer" });
  const imageBuffer = Buffer.from(response.data);

  // Check if the file already exists in the repository
  let sha: string | undefined;
  try {
    const { data } = await getContent(branchName, imageSavePath);

    if ("sha" in data) {
      sha = data.sha;
    }
  } catch (error) {
    // File doesn't exist, which is fine
  }

  await updateContent(branchName, imageSavePath, imageBuffer, sha);

  return `/${imageSavePath}`;
};

export const transformIncomingDataToOrbitChain = async (
  chainData: IncomingChainData,
  chainLogoPath: string,
  nativeTokenLogoPath?: string
): Promise<OrbitChain> => {
  const parentChainId = parseInt(chainData.parentChainId, 10);
  const isTestnet = TESTNET_PARENT_CHAIN_IDS.includes(parentChainId);

  // Fetch rollup contract data
  const rollupData = await fetchRollupContractData(
    chainData.rollup,
    chainData.rpcUrl
  );

  return {
    chainId: parseInt(chainData.chainId, 10),
    confirmPeriodBlocks: rollupData.confirmPeriodBlocks,
    ethBridge: {
      bridge: rollupData.bridge,
      inbox: rollupData.inbox,
      outbox: rollupData.outbox,
      rollup: chainData.rollup,
      sequencerInbox: rollupData.sequencerInbox,
    },
    nativeToken: chainData.nativeTokenAddress,
    explorerUrl: chainData.explorerUrl,
    rpcUrl: chainData.rpcUrl,
    isArbitrum: true,
    isCustom: true,
    isTestnet,
    name: chainData.name,
    slug: nameToSlug(chainData.name),
    parentChainId,
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      parentCustomGateway: chainData.parentCustomGateway,
      parentErc20Gateway: chainData.parentErc20Gateway,
      parentGatewayRouter: chainData.parentGatewayRouter,
      parentMulticall: chainData.parentMulticall,
      parentProxyAdmin: chainData.parentProxyAdmin,
      parentWeth: chainData.parentWeth,
      parentWethGateway: chainData.parentWethGateway,
      childCustomGateway: chainData.childCustomGateway,
      childErc20Gateway: chainData.childErc20Gateway,
      childGatewayRouter: chainData.childGatewayRouter,
      childMulticall: chainData.childMulticall,
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
