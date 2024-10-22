/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as core from "@actions/core";
import {
  initializeAndFetchData,
  processChainData,
  handleImages,
  createAndValidateOrbitChain,
  updateAndValidateOrbitChainsList,
  commitChangesAndCreatePR,
  setOutputs,
  runPrettier,
} from "./transforms";

/**
 * Main function to add an Orbit chain
 * @param targetJsonPath Path to the target JSON file
 */
export async function addOrbitChain(targetJsonPath: string): Promise<void> {
  try {
    await initializeAndFetchData();

    const { branchName, validatedIncomingData } = await processChainData();

    const { chainLogoPath, nativeTokenLogoPath } = await handleImages(
      branchName,
      validatedIncomingData
    );

    const orbitChain = await createAndValidateOrbitChain(
      validatedIncomingData,
      chainLogoPath,
      nativeTokenLogoPath
    );

    const updatedOrbitChainsList = await updateAndValidateOrbitChainsList(
      orbitChain,
      targetJsonPath
    );

    await runPrettier(targetJsonPath);

    await commitChangesAndCreatePR(
      branchName,
      targetJsonPath,
      updatedOrbitChainsList,
      orbitChain
    );

    setOutputs(branchName, orbitChain, targetJsonPath);
  } catch (error) {
    core.setFailed(`Error in addOrbitChain: ${error}`);
    throw error;
  }
}
