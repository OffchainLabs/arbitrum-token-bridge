/* eslint-disable jest/no-mocks-import */

import fs from "fs";
import path from "path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IncomingChainData } from "../schemas";
import {
  extractRawChainData,
  nameToSlug,
  resizeImage,
  stripWhitespace,
  transformIncomingDataToOrbitChain,
  updateOrbitChainsFile,
} from "../transforms";
import {
  fullMockIssue,
  mockIncomingChainData,
  mockOrbitChain,
} from "./__mocks__/chainDataMocks";

describe.skip("Transforms", () => {
  describe("extractRawChainData", () => {
    it("should extract raw chain data from the issue", () => {
      expect(extractRawChainData(fullMockIssue)).toMatchSnapshot();
    });
  });

  describe("transformIncomingDataToOrbitChain", () => {
    it("should transform incoming chain data to OrbitChain format", async () => {
      const chainLogoPath = "/images/mockChain_Logo.png";
      const nativeTokenLogoPath = "/images/mockChain_NativeTokenLogo.png";

      const result = await transformIncomingDataToOrbitChain(
        mockIncomingChainData as IncomingChainData,
        chainLogoPath,
        nativeTokenLogoPath
      );

      expect(result).toMatchSnapshot();
    });
  });

  describe("updateOrbitChainsFile", () => {
    const testData = `{
      "mainnet": [
        { "chainId": 2, "name": "Existing Chain 2" },
        { "chainId": 4, "name": "Existing Chain 4" },
        { "chainId": 1, "name": "Existing Chain 1" }
      ],
      "testnet": [
        { "chainId": 3, "name": "Existing Testnet 1" }
      ]
    }`;
    const tempFilePath = path.join(__dirname, "tempMockChains.json");

    beforeEach(() => {
      fs.writeFileSync(tempFilePath, testData, "utf8");
    });

    afterEach(() => {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    });

    it("should update the orbit chains file correctly while preserving order", () => {
      const newChain = { ...mockOrbitChain, isTestnet: false, chainId: 5 };
      const result = updateOrbitChainsFile(newChain, tempFilePath);

      expect(result.mainnet.map((chain: any) => chain.chainId)).toEqual([
        2, 4, 1, 5,
      ]);
      expect(result.testnet.map((chain: any) => chain.chainId)).toEqual([3]);
      expect(result.mainnet.find((chain: any) => chain.chainId === 5)).toEqual(
        newChain
      );

      const updatedContent = fs.readFileSync(tempFilePath, "utf8");
      expect(updatedContent).toMatchSnapshot();
    });

    it("should add a new testnet chain while preserving order", () => {
      const newTestnetChain = {
        ...mockOrbitChain,
        isTestnet: true,
        chainId: 5,
      };
      const result = updateOrbitChainsFile(newTestnetChain, tempFilePath);

      expect(result.mainnet.map((chain: any) => chain.chainId)).toEqual([
        2, 4, 1,
      ]);
      expect(result.testnet.map((chain: any) => chain.chainId)).toEqual([3, 5]);
      expect(result.testnet.find((chain: any) => chain.chainId === 5)).toEqual(
        newTestnetChain
      );

      const updatedContent = fs.readFileSync(tempFilePath, "utf8");
      expect(updatedContent).toMatchSnapshot();
    });

    it("should handle updating an existing chain while preserving order", () => {
      const existingChainId = 2;
      const updatedChain = {
        ...mockOrbitChain,
        isTestnet: false,
        chainId: existingChainId,
        name: "Updated Chain",
      };
      const result = updateOrbitChainsFile(updatedChain, tempFilePath);

      expect(result.mainnet.map((chain: any) => chain.chainId)).toEqual([
        2, 4, 1,
      ]);
      expect(result.testnet.map((chain: any) => chain.chainId)).toEqual([3]);
      expect(result.mainnet.find((chain: any) => chain.chainId === 2)).toEqual(
        updatedChain
      );

      const updatedContent = fs.readFileSync(tempFilePath, "utf8");
      expect(updatedContent).toMatchSnapshot();
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

  describe("resizeImage", () => {
    const testImagePath = path.join(__dirname, "__mocks__", "test-image.jpg");
    const resizedImagePath = path.join(
      __dirname,
      "__mocks__",
      "resized-test-image.jpg"
    );

    // COMMENT OUT TO KEEP RESIZED IMAGES
    afterEach(() => {
      // Clean up the resized image after each test
      if (fs.existsSync(resizedImagePath)) {
        fs.unlinkSync(resizedImagePath);
      }
    });

    it("should resize an image to under 100KB while maintaining aspect ratio", async () => {
      const inputBuffer = fs.readFileSync(testImagePath);
      const resizedBuffer = await resizeImage(inputBuffer);

      expect(resizedBuffer.length).toBeLessThanOrEqual(100 * 1024);

      // Save the resized image
      fs.writeFileSync(resizedImagePath, resizedBuffer);
      console.log(`Resized image saved to: ${resizedImagePath}`);

      // Additional check to ensure the file was actually saved
      expect(fs.existsSync(resizedImagePath)).toBe(true);
      const savedFileSize = fs.statSync(resizedImagePath).size;
      expect(savedFileSize).toBeLessThanOrEqual(100 * 1024);

      // Verify that the saved image can be decoded and aspect ratio is maintained
      const originalMetadata = await sharp(testImagePath).metadata();
      const resizedMetadata = await sharp(resizedImagePath).metadata();

      expect(resizedMetadata.format).toBe("jpeg");
      expect(resizedMetadata.width).toBeLessThanOrEqual(
        originalMetadata.width!
      );
      expect(resizedMetadata.height).toBeLessThanOrEqual(
        originalMetadata.height!
      );

      const originalAspectRatio =
        originalMetadata.width! / originalMetadata.height!;
      const resizedAspectRatio =
        resizedMetadata.width! / resizedMetadata.height!;
      expect(resizedAspectRatio).toBeCloseTo(originalAspectRatio, 2);
    });
  });
});
