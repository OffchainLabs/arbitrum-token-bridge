import { constants, addCustomNetwork } from '@arbitrum/sdk'

import {
  ChainId,
  getBaseChainIdByChainId,
  getSupportedChainIds
} from '../networks'
import { orbitTestnets } from '../orbitChainsList'

const xaiTestnetChainId = 37714555429

beforeAll(() => {
  const xaiTestnet = orbitTestnets[xaiTestnetChainId]

  if (!xaiTestnet) {
    throw new Error(`Could not find Xai Testnet in the Orbit chains list.`)
  }

  // add local
  addCustomNetwork({
    customL1Network: {
      blockTime: 10,
      chainID: 1337,
      explorerUrl: '',
      isCustom: true,
      name: 'Ethereum Local',
      partnerChainIDs: [412346],
      isArbitrum: false
    },
    customL2Network: {
      chainID: 412346,
      partnerChainIDs: [
        // Orbit chains will go here
      ],
      confirmPeriodBlocks: 20,
      ethBridge: {
        bridge: '0x2b360a9881f21c3d7aa0ea6ca0de2a3341d4ef3c',
        inbox: '0xff4a24b22f94979e9ba5f3eb35838aa814bad6f1',
        outbox: '0x49940929c7cA9b50Ff57a01d3a92817A414E6B9B',
        rollup: '0x65a59d67da8e710ef9a01eca37f83f84aedec416',
        sequencerInbox: '0xe7362d0787b51d8c72d504803e5b1d6dcda89540'
      },
      explorerUrl: '',
      isArbitrum: true,
      isCustom: true,
      name: 'Arbitrum Local',
      partnerChainID: 1337,
      retryableLifetimeSeconds: 604800,
      nitroGenesisBlock: 0,
      nitroGenesisL1Block: 0,
      depositTimeout: 900000,
      blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS,
      tokenBridge: {
        l1CustomGateway: '0x75E0E92A79880Bd81A69F72983D03c75e2B33dC8',
        l1ERC20Gateway: '0x4Af567288e68caD4aA93A272fe6139Ca53859C70',
        l1GatewayRouter: '0x85D9a8a4bd77b9b5559c1B7FCb8eC9635922Ed49',
        l1MultiCall: '0xA39FFA43ebA037D67a0f4fe91956038ABA0CA386',
        l1ProxyAdmin: '0x7E32b54800705876d3b5cFbc7d9c226a211F7C1a',
        l1Weth: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48',
        l1WethGateway: '0x408Da76E87511429485C32E4Ad647DD14823Fdc4',
        l2CustomGateway: '0x525c2aBA45F66987217323E8a05EA400C65D06DC',
        l2ERC20Gateway: '0xe1080224B632A93951A7CFA33EeEa9Fd81558b5e',
        l2GatewayRouter: '0x1294b86822ff4976BfE136cB06CF43eC7FCF2574',
        l2Multicall: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48',
        l2ProxyAdmin: '0xda52b25ddB0e3B9CC393b0690Ac62245Ac772527',
        l2Weth: '0x408Da76E87511429485C32E4Ad647DD14823Fdc4',
        l2WethGateway: '0x4A2bA922052bA54e29c5417bC979Daaf7D5Fe4f4'
      }
    }
  })

  addCustomNetwork({
    customL2Network: xaiTestnet
  })
})

describe('getBaseChainIdByChainId', () => {
  describe('chainId is the id of a base chain', () => {
    it('should return the chainId', () => {
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.Ethereum
        })
      ).toBe(ChainId.Ethereum)
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.Goerli
        })
      ).toBe(ChainId.Goerli)
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.Sepolia
        })
      ).toBe(ChainId.Sepolia)
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.Local
        })
      ).toBe(ChainId.Local)
    })
  })

  describe('chainId is the id of an L2 chain', () => {
    it('should return the correct base chain', () => {
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.ArbitrumOne
        })
      ).toBe(ChainId.Ethereum)
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.ArbitrumNova
        })
      ).toBe(ChainId.Ethereum)
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.ArbitrumGoerli
        })
      ).toBe(ChainId.Goerli)
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.ArbitrumSepolia
        })
      ).toBe(ChainId.Sepolia)
      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.ArbitrumLocal
        })
      ).toBe(ChainId.Local)
    })
  })

  describe('chainId is the id of an L3 Orbit chain', () => {
    it('should return the correct base chain', () => {
      expect(
        getBaseChainIdByChainId({
          chainId: xaiTestnetChainId
        })
      ).toBe(ChainId.Sepolia)

      expect(
        getBaseChainIdByChainId({
          chainId: ChainId.StylusTestnet
        })
      ).toBe(ChainId.Sepolia)
    })
  })

  describe('chainId is the id of an chain not added to the list of chains', () => {
    it('should return the chainId', () => {
      expect(
        getBaseChainIdByChainId({
          chainId: 2222
        })
      ).toBe(2222)
    })
  })
})

describe('getSupportedChainIds', () => {
  describe('includeMainnets is true, includeTestnets is unset', () => {
    it('should return a list of chain ids that includes Mainnets', () => {
      expect(getSupportedChainIds({ includeMainnets: true })).toContain(
        ChainId.Ethereum
      )
      expect(getSupportedChainIds({ includeMainnets: true })).toContain(
        ChainId.ArbitrumOne
      )
      expect(getSupportedChainIds({ includeMainnets: true })).toContain(
        ChainId.ArbitrumNova
      )
    })
    it('should return a list of chain ids that does not include Testnets', () => {
      expect(getSupportedChainIds({ includeMainnets: true })).not.toContain(
        ChainId.Goerli
      )
      expect(getSupportedChainIds({ includeMainnets: true })).not.toContain(
        ChainId.ArbitrumGoerli
      )
      expect(getSupportedChainIds({ includeMainnets: true })).not.toContain(
        ChainId.Sepolia
      )
      expect(getSupportedChainIds({ includeMainnets: true })).not.toContain(
        ChainId.ArbitrumSepolia
      )
      expect(getSupportedChainIds({ includeMainnets: true })).not.toContain(
        ChainId.Local
      )
      expect(getSupportedChainIds({ includeMainnets: true })).not.toContain(
        ChainId.ArbitrumLocal
      )
      expect(getSupportedChainIds({ includeMainnets: true })).not.toContain(
        ChainId.StylusTestnet
      )
    })
  })
  describe('includeMainnets is true, includeTestnets is true', () => {
    it('should return a list of chain ids that includes Mainnets', () => {
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.Ethereum)
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.ArbitrumOne)
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.ArbitrumNova)
    })
    it('should return a list of chain ids that includes Testnets', () => {
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.Goerli)
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.ArbitrumGoerli)
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.Sepolia)
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.ArbitrumSepolia)
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.Local)
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.ArbitrumLocal)
      expect(
        getSupportedChainIds({ includeMainnets: true, includeTestnets: true })
      ).toContain(ChainId.StylusTestnet)
    })
  })
  describe('includeMainnets is unset, includeTestnets is true', () => {
    it('should return a list of chain ids that includes Mainnets', () => {
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.Ethereum
      )
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.ArbitrumOne
      )
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.ArbitrumNova
      )
    })
    it('should return a list of chain ids that includes Testnets', () => {
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.Goerli
      )
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.ArbitrumGoerli
      )
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.Sepolia
      )
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.ArbitrumSepolia
      )
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.Local
      )
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.ArbitrumLocal
      )
      expect(getSupportedChainIds({ includeTestnets: true })).toContain(
        ChainId.StylusTestnet
      )
    })
  })
  describe('includeMainnets is false, includeTestnets is false', () => {
    it('should return a list of chain ids that includes Mainnets', () => {
      expect(
        getSupportedChainIds({ includeMainnets: false, includeTestnets: false })
      ).toHaveLength(0)
    })
  })
})
