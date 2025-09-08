import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { IncomingChainData, Issue } from '../schemas'
import {
  extractImageUrlFromMarkdown,
  extractRawChainData,
  fetchAndProcessImage,
  nameToSlug,
  resizeImage,
  stripWhitespace,
  transformIncomingDataToOrbitChain,
  updateOrbitChainsFile
} from '../transforms'
import {
  fullMockIssue,
  mockIncomingChainData,
  mockOrbitChain
} from './__mocks__/chainDataMocks'
import { warning } from '@actions/core'
import axios from 'axios'

describe('Transforms', () => {
  describe('extractRawChainData', () => {
    it('should extract raw chain data from the issue', () => {
      expect(extractRawChainData(fullMockIssue)).toMatchSnapshot()
    })
  })

  describe('transformIncomingDataToOrbitChain', () => {
    it('should transform incoming chain data to OrbitChain format', async () => {
      const chainLogoPath = '/images/mockChain_Logo.png'
      const nativeTokenLogoPath = '/images/mockChain_NativeTokenLogo.png'

      const result = await transformIncomingDataToOrbitChain(
        mockIncomingChainData as IncomingChainData,
        chainLogoPath,
        nativeTokenLogoPath
      )

      expect(result).toMatchSnapshot()
    })
  })

  describe('updateOrbitChainsFile', () => {
    const testData = `{
      "mainnet": [
        { "chainId": 2, "name": "Existing Chain 2" },
        { "chainId": 4, "name": "Existing Chain 4" },
        { "chainId": 1, "name": "Existing Chain 1" }
      ],
      "testnet": [
        { "chainId": 3, "name": "Existing Testnet 1" }
      ]
    }`
    const tempFilePath = path.join(__dirname, 'tempMockChains.json')

    beforeEach(() => {
      fs.writeFileSync(tempFilePath, testData, 'utf8')
    })

    afterEach(() => {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath)
      }
    })

    it('should update the orbit chains file correctly while preserving order', () => {
      const newChain = { ...mockOrbitChain, isTestnet: false, chainId: 5 }
      const result = updateOrbitChainsFile(newChain, tempFilePath)

      expect(result.mainnet.map((chain: any) => chain.chainId)).toEqual([
        2, 4, 1, 5
      ])
      expect(result.testnet.map((chain: any) => chain.chainId)).toEqual([3])
      expect(result.mainnet.find((chain: any) => chain.chainId === 5)).toEqual(
        newChain
      )

      const updatedContent = fs.readFileSync(tempFilePath, 'utf8')
      expect(updatedContent).toMatchSnapshot()
    })

    it('should add a new testnet chain while preserving order', () => {
      const newTestnetChain = {
        ...mockOrbitChain,
        isTestnet: true,
        chainId: 5
      }
      const result = updateOrbitChainsFile(newTestnetChain, tempFilePath)

      expect(result.mainnet.map((chain: any) => chain.chainId)).toEqual([
        2, 4, 1
      ])
      expect(result.testnet.map((chain: any) => chain.chainId)).toEqual([3, 5])
      expect(result.testnet.find((chain: any) => chain.chainId === 5)).toEqual(
        newTestnetChain
      )

      const updatedContent = fs.readFileSync(tempFilePath, 'utf8')
      expect(updatedContent).toMatchSnapshot()
    })

    it('should handle updating an existing chain while preserving order', () => {
      const existingChainId = 2
      const updatedChain = {
        ...mockOrbitChain,
        isTestnet: false,
        chainId: existingChainId,
        name: 'Updated Chain'
      }
      const result = updateOrbitChainsFile(updatedChain, tempFilePath)

      expect(result.mainnet.map((chain: any) => chain.chainId)).toEqual([
        2, 4, 1
      ])
      expect(result.testnet.map((chain: any) => chain.chainId)).toEqual([3])
      expect(result.mainnet.find((chain: any) => chain.chainId === 2)).toEqual(
        updatedChain
      )

      const updatedContent = fs.readFileSync(tempFilePath, 'utf8')
      expect(updatedContent).toMatchSnapshot()
    })
  })

  describe('Utility Functions', () => {
    describe('stripWhitespace', () => {
      it('should remove all whitespace from a string', () => {
        expect(stripWhitespace('  Hello  World  ')).toBe('HelloWorld')
        expect(stripWhitespace('No Spaces')).toBe('NoSpaces')
        expect(stripWhitespace(' ')).toBe('')
        expect(stripWhitespace('')).toBe('')
      })
    })

    describe('nameToSlug', () => {
      it('should convert a name to a slug', () => {
        expect(nameToSlug('Hello World')).toBe('hello-world')
        expect(nameToSlug('Test Chain')).toBe('test-chain')
        expect(nameToSlug('Multiple   Spaces')).toBe('multiple-spaces')
        expect(nameToSlug('')).toBe('')
      })
    })
  })

  describe('resizeImage', () => {
    const testImagePath = path.join(__dirname, '__mocks__', 'test-image.jpg')
    const resizedImagePath = path.join(
      __dirname,
      '__mocks__',
      'resized-test-image.jpg'
    )

    // COMMENT OUT TO KEEP RESIZED IMAGES
    afterEach(() => {
      // Clean up the resized image after each test
      if (fs.existsSync(resizedImagePath)) {
        fs.unlinkSync(resizedImagePath)
      }
    })

    it('should resize an image to under 100KB while maintaining aspect ratio', async () => {
      const inputBuffer = fs.readFileSync(testImagePath)
      const resizedBuffer = await resizeImage(inputBuffer)

      expect(resizedBuffer.length).toBeLessThanOrEqual(100 * 1024)

      // Save the resized image
      fs.writeFileSync(resizedImagePath, resizedBuffer)
      console.log(`Resized image saved to: ${resizedImagePath}`)

      // Additional check to ensure the file was actually saved
      expect(fs.existsSync(resizedImagePath)).toBe(true)
      const savedFileSize = fs.statSync(resizedImagePath).size
      expect(savedFileSize).toBeLessThanOrEqual(100 * 1024)

      // Verify that the saved image can be decoded and aspect ratio is maintained
      const originalMetadata = await sharp(testImagePath).metadata()
      const resizedMetadata = await sharp(resizedImagePath).metadata()

      expect(resizedMetadata.format).toBe('jpeg')
      expect(resizedMetadata.width).toBeLessThanOrEqual(originalMetadata.width!)
      expect(resizedMetadata.height).toBeLessThanOrEqual(
        originalMetadata.height!
      )

      const originalAspectRatio =
        originalMetadata.width! / originalMetadata.height!
      const resizedAspectRatio =
        resizedMetadata.width! / resizedMetadata.height!
      expect(resizedAspectRatio).toBeCloseTo(originalAspectRatio, 2)
    })
  })
  describe('Image Download and Processing', () => {
    const downloadedImagePath = path.join(
      process.cwd(),
      '..',
      '..',
      'arb-token-bridge-ui',
      'public',
      'images',
      'downloaded_chain_logo.png'
    )

    // Clean up downloaded image after tests
    // Comment out the following 'after' block if you want to inspect the downloaded image
    afterAll(() => {
      if (fs.existsSync(downloadedImagePath)) {
        fs.unlinkSync(downloadedImagePath)
        console.log('Cleaned up downloaded image')
      }
    })

    it('should download, process, and save the chain logo image from fullMockIssue', async () => {
      const rawChainData = extractRawChainData(fullMockIssue)
      const imageUrl = rawChainData.chainLogo as string

      expect(imageUrl).toBeTruthy()
      expect(imageUrl.startsWith('https://')).toBe(true)

      const { buffer, fileExtension } = await fetchAndProcessImage(imageUrl)

      expect(buffer).toBeTruthy()
      expect(buffer.length).toBeGreaterThan(0)
      expect(fileExtension).toBeTruthy()

      const fileName = 'downloaded_chain_logo'
      const savedImagePath = saveImageLocally(buffer, fileName, fileExtension)

      expect(savedImagePath).toBeTruthy()
      console.log(`Image downloaded and saved to: ${savedImagePath}`)

      const fullSavePath = path.join(
        process.cwd(),
        '..',
        '..',
        'arb-token-bridge-ui',
        'public',
        savedImagePath
      )
      expect(fs.existsSync(fullSavePath)).toBe(true)

      const stats = fs.statSync(fullSavePath)
      expect(stats.size).toBeGreaterThan(0)
    })

    it('should throw an error if the image fetch fails', async () => {
      const invalidUrl = 'https://example.com/nonexistent-image.png'
      await expect(fetchAndProcessImage(invalidUrl)).rejects.toThrow()
    })

    it('should correctly identify and handle SVG images without extension', async () => {
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
          <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
        </svg>`

      // Mock axios for this test
      const mockAxios = vi.spyOn(axios, 'get').mockResolvedValueOnce({
        status: 200,
        data: svgContent,
        headers: {
          'content-type': 'application/octet-stream' // Intentionally wrong content-type
        }
      })

      const { buffer, fileExtension } = await fetchAndProcessImage(
        'https://example.com/logo'
      )

      // Verify it detected SVG correctly
      expect(fileExtension).toBe('.svg')
      // Verify the SVG content wasn't modified
      expect(buffer.toString('utf8').trim()).toBe(svgContent.trim())

      mockAxios.mockRestore()
    })
  })

  describe('Image URL Extraction', () => {
    describe('extractImageUrlFromMarkdown', () => {
      it('should extract URL from old GitHub markdown format', () => {
        const oldFormat =
          '![Image](https://github.com/user-attachments/assets/0e5ddf1f-0847-457d-be07-f489d68630e8)'
        const result = extractImageUrlFromMarkdown(oldFormat)
        expect(result).toBe(
          'https://github.com/user-attachments/assets/0e5ddf1f-0847-457d-be07-f489d68630e8'
        )
      })

      it('should extract URL from new GitHub HTML img tag format', () => {
        const newFormat = `<img width="1034" height="557" alt="Image" src="https://github.com/user-attachments/assets/0e5ddf1f-0847-457d-be07-f489d68630e8" />`
        const result = extractImageUrlFromMarkdown(newFormat)
        expect(result).toBe(
          'https://github.com/user-attachments/assets/0e5ddf1f-0847-457d-be07-f489d68630e8'
        )
      })

      it('should extract URL from HTML img tag with single quotes', () => {
        const singleQuoteFormat = `<img width="1034" height="557" alt="Image" src='https://github.com/user-attachments/assets/0e5ddf1f-0847-457d-be07-f489d68630e8' />`
        const result = extractImageUrlFromMarkdown(singleQuoteFormat)
        expect(result).toBe(
          'https://github.com/user-attachments/assets/0e5ddf1f-0847-457d-be07-f489d68630e8'
        )
      })

      it('should extract URL from HTML img tag with different attribute order', () => {
        const differentOrderFormat = `<img src="https://github.com/user-attachments/assets/0e5ddf1f-0847-457d-be07-f489d68630e8" width="1034" height="557" alt="Image" />`
        const result = extractImageUrlFromMarkdown(differentOrderFormat)
        expect(result).toBe(
          'https://github.com/user-attachments/assets/0e5ddf1f-0847-457d-be07-f489d68630e8'
        )
      })

      it('should return original string if no image format is detected', () => {
        const plainUrl = 'https://example.com/direct-url.png'
        const result = extractImageUrlFromMarkdown(plainUrl)
        expect(result).toBe(plainUrl)
      })
    })

    it('should handle both markdown and direct URL for chain and token logos', () => {
      const issue: Issue = {
        body: `
### Chain logo
![chain-logo](https://example.com/chain-logo.png)
### Native token logo
https://example.com/token-logo.png
### Chain name
Test Chain
          `,
        state: 'open',
        html_url: 'https://github.com/example/repo/issues/1'
      }

      const result = extractRawChainData(issue)
      expect(result.chainLogo).toBe('https://example.com/chain-logo.png')
      expect(result.nativeTokenLogo).toBe('https://example.com/token-logo.png')
    })
  })
})

const saveImageLocally = (
  imageBuffer: Buffer,
  fileName: string,
  fileExtension: string
): string => {
  const imageSavePath = `images/${fileName}${fileExtension}`
  const fullSavePath = path.join(
    process.cwd(),
    '..',
    '..',
    'arb-token-bridge-ui',
    'public',
    imageSavePath
  )

  // Create directories if they don't exist
  const dirs = path.dirname(fullSavePath)
  if (!fs.existsSync(dirs)) {
    fs.mkdirSync(dirs, { recursive: true })
  }

  if (fs.existsSync(fullSavePath)) {
    warning(
      `${fileName} already exists at '${imageSavePath}'. Overwriting the existing image.`
    )
  }

  fs.writeFileSync(fullSavePath, imageBuffer)

  return `/${imageSavePath}`
}
