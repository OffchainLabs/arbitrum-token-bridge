/* eslint-disable jest/no-mocks-import */

import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { IncomingChainData } from "../schemas";
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
      fs.writeFileSync(
        tempFilePath,
        JSON.stringify({ mainnet: {}, testnet: {} }),
        "utf8"
      );
    });

    afterEach(() => {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    });

    it("should update the orbit chains file correctly", () => {
      const result = updateOrbitChainsFile(mockOrbitChain, tempFilePath);
      expect(result.mainnet[mockOrbitChain.chainId]).toEqual(mockOrbitChain);
      expect(JSON.parse(fs.readFileSync(tempFilePath, "utf8"))).toEqual(result);
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
