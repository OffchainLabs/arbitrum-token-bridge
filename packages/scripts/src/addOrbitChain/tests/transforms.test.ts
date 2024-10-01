/* eslint-disable jest/no-mocks-import */

import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it, afterEach } from "vitest";
import { IncomingChainData, OrbitChainsList } from "../schemas";
import {
  extractRawChainData,
  nameToSlug,
  stripWhitespace,
  transformIncomingDataToOrbitChain,
  updateOrbitChainsFile,
} from "../transforms";
import {
  fullMockIssue,
  mockIncomingChainData,
  mockOrbitChain,
} from "./__mocks__/chainDataMocks";

describe("Transforms", () => {
  describe("extractRawChainData", () => {
    it("should extract raw chain data from the issue", () => {
      expect(extractRawChainData(fullMockIssue)).toMatchSnapshot();
    });
  });

  describe("transformIncomingDataToOrbitChain", () => {
    it("should transform incoming chain data to OrbitChain format", () => {
      const chainLogoPath = "/images/mockChain_Logo.png";
      const nativeTokenLogoPath = "/images/mockChain_NativeTokenLogo.png";

      const result = transformIncomingDataToOrbitChain(
        mockIncomingChainData as IncomingChainData,
        chainLogoPath,
        nativeTokenLogoPath
      );

      expect(result).toMatchSnapshot();
    });
  });

  describe("updateOrbitChainsFile", () => {
    const tempFilePath = path.join(__dirname, "tempMockChains.json");

    beforeEach(() => {
      const initialContent: OrbitChainsList = {
        mainnet: {
          "1": { chainId: 1, name: "Existing Chain 1" },
          "2": { chainId: 2, name: "Existing Chain 2" },
        },
        testnet: {
          "3": { chainId: 3, name: "Existing Testnet 1" },
        },
      } as OrbitChainsList;

      fs.writeFileSync(
        tempFilePath,
        JSON.stringify(initialContent, null, 2),
        "utf8"
      );
    });

    afterEach(() => {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    });

    it("should update the orbit chains file correctly while preserving order", () => {
      const newChain = { ...mockOrbitChain, isTestnet: false, chainId: 4 };
      const result = updateOrbitChainsFile(newChain, tempFilePath);

      // Check if the new chain is added
      expect(result.mainnet[newChain.chainId]).toEqual(newChain);

      // Read the file content to check the order
      const fileContent = fs.readFileSync(tempFilePath, "utf8");
      const parsedContent: OrbitChainsList = JSON.parse(fileContent);

      // Check if the order is preserved in the file
      expect(Object.keys(parsedContent.mainnet)).toEqual(["1", "2", "4"]);
      expect(Object.keys(parsedContent.testnet)).toEqual(["3"]);

      // Check if the content matches the returned result
      expect(parsedContent).toEqual(result);
    });

    it("should add a new testnet chain while preserving order", () => {
      const newTestnetChain = {
        ...mockOrbitChain,
        isTestnet: true,
        chainId: 5,
      };
      const result = updateOrbitChainsFile(newTestnetChain, tempFilePath);

      // Check if the new chain is added
      expect(result.testnet[newTestnetChain.chainId]).toEqual(newTestnetChain);

      // Read the file content to check the order
      const fileContent = fs.readFileSync(tempFilePath, "utf8");
      const parsedContent: OrbitChainsList = JSON.parse(fileContent);

      // Check if the order is preserved in the file
      expect(Object.keys(parsedContent.mainnet)).toEqual(["1", "2"]);
      expect(Object.keys(parsedContent.testnet)).toEqual(["3", "5"]);

      // Check if the content matches the returned result
      expect(parsedContent).toEqual(result);
    });

    it("should handle adding a chain with an existing chainId", () => {
      const existingChainId = 2;
      const updatedChain = {
        ...mockOrbitChain,
        isTestnet: false,
        chainId: existingChainId,
        name: "Updated Chain",
      };
      const result = updateOrbitChainsFile(updatedChain, tempFilePath);

      // Check if the chain is updated
      expect(result.mainnet[existingChainId]).toEqual(updatedChain);

      // Read the file content to check the order
      const fileContent = fs.readFileSync(tempFilePath, "utf8");
      const parsedContent: OrbitChainsList = JSON.parse(fileContent);

      // Check if the order is preserved in the file
      expect(Object.keys(parsedContent.mainnet)).toEqual(["1", "2"]);
      expect(Object.keys(parsedContent.testnet)).toEqual(["3"]);

      // Check if the content matches the returned result
      expect(parsedContent).toEqual(result);
    });
  });

  describe("Utility Functions", () => {
    describe("stripWhitespace", () => {
      it("should remove all whitespace from a string", () => {
        expect(stripWhitespace("  Hello  World  ")).toBe("HelloWorld");
        expect(stripWhitespace("No Spaces")).toBe("NoSpaces");
        expect(stripWhitespace(" ")).toBe("");
        expect(stripWhitespace("")).toBe("");
      });
    });

    describe("nameToSlug", () => {
      it("should convert a name to a slug", () => {
        expect(nameToSlug("Hello World")).toBe("hello-world");
        expect(nameToSlug("Test Chain")).toBe("test-chain");
        expect(nameToSlug("Multiple   Spaces")).toBe("multiple-spaces");
        expect(nameToSlug("")).toBe("");
      });
    });
  });
});
