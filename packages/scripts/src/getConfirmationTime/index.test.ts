import { describe, it, expect, vi } from "vitest";
import {
  calculateConfirmationTime,
  getOrbitChainIds,
  updateAllConfirmationTimes,
} from "./index";
import * as transforms from "../addOrbitChain/transforms";

// Mock the updateOrbitChainsFile function
// vi.mock("../addOrbitChain/transforms", () => ({
//   updateOrbitChainsFile: vi.fn(),
// }));

describe("calculateConfirmationTime", () => {
  const orbitChainIds = getOrbitChainIds();

  it.each(orbitChainIds)(
    "should calculate the confirmation time for chain %i",
    async (chainId) => {
      const result = await calculateConfirmationTime(chainId);
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);
      // expect(transforms.updateOrbitChainsFile).toHaveBeenCalled();
    },
    60000 // Increase timeout to 60 seconds
  );

  it("should throw an error when chain is not found", async () => {
    await expect(calculateConfirmationTime(999)).rejects.toThrow(
      "Chain with ID 999 not found in orbitChainsData"
    );
  });
});

describe.skip("updateAllConfirmationTimes", () => {
  it("should update confirmation times for all chains", async () => {
    await updateAllConfirmationTimes();
    // expect(transforms.updateOrbitChainsFile).toHaveBeenCalledTimes(
    //   getOrbitChainIds().length
    // );
  }, 100000);
});
1728390038;
1728389788;
