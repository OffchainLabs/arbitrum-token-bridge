import {
  fetchRollupContractData,
  getProvider,
  getRollupContract,
} from "../network";

describe("Network Functions", () => {
  it("fetches rollup contract data for an Arbitrum Orbit chain", async () => {
    const parentChainRpcUrl = "https://sepolia-rollup.arbitrum.io/rpc";
    const orbitChainRollupAddress =
      "0xeedE9367Df91913ab149e828BDd6bE336df2c892";

    console.log("Starting test with the following parameters:");
    console.log("Parent Chain RPC URL:", parentChainRpcUrl);
    console.log("Orbit Chain Rollup Address:", orbitChainRollupAddress);

    try {
      // check if we can connect to the provider
      const provider = await getProvider(parentChainRpcUrl);
      const network = await provider.getNetwork();
      console.log(
        "Connected to network:",
        network.name,
        "chainId:",
        network.chainId
      );

      // check if the contract exists
      const code = await provider.getCode(orbitChainRollupAddress);
      if (code === "0x") {
        throw new Error("No contract found at the given address");
      }
      console.log("Contract found at the given address");

      // ry to interact with the contract
      const contract = await getRollupContract(
        orbitChainRollupAddress,
        provider
      );

      // try to call each method individually and log the result
      for (const method of [
        "bridge",
        "inbox",
        "sequencerInbox",
        "outbox",
        "confirmPeriodBlocks",
      ]) {
        try {
          const result = await contract[method]();
          console.log(`${method}() call successful:`, result);
        } catch (error) {
          console.error(`Error calling ${method}():`, error);
        }
      }

      const rollupData = await fetchRollupContractData(
        orbitChainRollupAddress,
        parentChainRpcUrl
      );

      // Log the fetched data
      console.log(
        "Fetched Rollup Contract Data:",
        JSON.stringify(rollupData, null, 2)
      );

      // Assertions to verify the structure and content of the fetched data
      expect(rollupData).toHaveProperty("bridge");
      expect(rollupData).toHaveProperty("inbox");
      expect(rollupData).toHaveProperty("sequencerInbox");
      expect(rollupData).toHaveProperty("outbox");
      expect(rollupData).toHaveProperty("confirmPeriodBlocks");

      // Check that the addresses are valid Ethereum addresses
      const addressRegex = /^0x[a-fA-F0-9]{40}$/;
      expect(rollupData.bridge).toMatch(addressRegex);
      expect(rollupData.inbox).toMatch(addressRegex);
      expect(rollupData.sequencerInbox).toMatch(addressRegex);
      expect(rollupData.outbox).toMatch(addressRegex);

      // Check that confirmPeriodBlocks is a positive number
      expect(rollupData.confirmPeriodBlocks).toBeGreaterThan(0);

      console.log("All assertions passed successfully");
    } catch (error) {
      console.error("Test failed with error:", error);
      throw error;
    }
  }, 30000); // Increase timeout to 30 seconds for network calls
});
