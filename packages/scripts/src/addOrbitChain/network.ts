import { ethers } from "ethers";

export async function getProvider(rpcUrl: string) {
  console.log(`Connecting to provider at ${rpcUrl}`);
  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    await provider.getNetwork(); // Test the connection
    console.log("Successfully connected to the provider");
    return provider;
  } catch (error) {
    console.error("Failed to connect to the provider:", error);
    throw error;
  }
}

export async function getRollupContract(
  rollupAddress: string,
  provider: ethers.providers.Provider
) {
  console.log(`Creating rollup contract instance at address ${rollupAddress}`);
  const rollupABI = [
    "function bridge() view returns (address)",
    "function inbox() view returns (address)",
    "function sequencerInbox() view returns (address)",
    "function outbox() view returns (address)",
    "function confirmPeriodBlocks() view returns (uint256)",
  ];
  return new ethers.Contract(rollupAddress, rollupABI, provider);
}

async function callContractMethod(
  contract: ethers.Contract,
  methodName: string
) {
  console.log(`Calling ${methodName} method on contract`);
  try {
    const result = await contract[methodName]();
    console.log(`${methodName} call successful:`, result);
    return result;
  } catch (error) {
    console.error(`Error calling ${methodName}:`, error);
    throw error;
  }
}

export async function getBridge(rollupContract: ethers.Contract) {
  return await callContractMethod(rollupContract, "bridge");
}

export async function getInbox(rollupContract: ethers.Contract) {
  return await callContractMethod(rollupContract, "inbox");
}

export async function getSequencerInbox(rollupContract: ethers.Contract) {
  return await callContractMethod(rollupContract, "sequencerInbox");
}

export async function getOutbox(rollupContract: ethers.Contract) {
  return await callContractMethod(rollupContract, "outbox");
}

export async function getConfirmPeriodBlocks(rollupContract: ethers.Contract) {
  const confirmPeriodBlocks = await callContractMethod(
    rollupContract,
    "confirmPeriodBlocks"
  );
  return confirmPeriodBlocks.toNumber();
}

export async function fetchRollupContractData(
  rollupAddress: string,
  rpcUrl: string
) {
  console.log(`Fetching rollup contract data for address ${rollupAddress}`);
  try {
    const provider = await getProvider(rpcUrl);
    const rollupContract = await getRollupContract(rollupAddress, provider);

    console.log("Fetching contract data...");
    const [bridge, inbox, sequencerInbox, outbox, confirmPeriodBlocks] =
      await Promise.all([
        getBridge(rollupContract),
        getInbox(rollupContract),
        getSequencerInbox(rollupContract),
        getOutbox(rollupContract),
        getConfirmPeriodBlocks(rollupContract),
      ]);

    console.log("Successfully fetched all contract data");
    return {
      bridge,
      inbox,
      sequencerInbox,
      outbox,
      confirmPeriodBlocks,
    };
  } catch (error) {
    console.error("Error fetching rollup contract data:", error);
    throw error;
  }
}
