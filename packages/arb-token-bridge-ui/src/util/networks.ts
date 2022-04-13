import { addCustomNetwork } from '@arbitrum/sdk'

const INFURA_KEY = process.env.REACT_APP_INFURA_KEY as string

if (!INFURA_KEY) {
  throw new Error('Infura API key not provided')
}

export interface Network {
  chainID: string
  name: string
  url: string
  explorerUrl: string
  partnerChainID: string
  tokenBridge: TokenBridge
  gif?: string
  blockTime?: number // seconds
  bridgeUpdateBlockNumber?: number
}

interface TokenBridge {
  l1Address: string
  l2Address: string
}

interface Networks {
  [id: string]: Network
}

export const MAINNET_WHITELIST_ADDRESS =
  '0xD485e5c28AA4985b23f6DF13dA03caa766dcd459'

const mainnetBridge: TokenBridge = {
  l1Address: '0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef',
  l2Address: '0x5288c571Fd7aD117beA99bF60FE0846C4E84F933'
}

const kovan5Bridge: TokenBridge = {
  l1Address: '0x1d750369c91b129524B68f308512b0FE2C903d71',
  l2Address: '0x2EEBB8EE9c377caBC476654ca4aba016ECA1B9fc'
}

const RinkebyBridge: TokenBridge = {
  l1Address: '0x70C143928eCfFaf9F5b406f7f4fC28Dc43d68380',
  l2Address: '0x9413AD42910c1eA60c737dB5f58d1C504498a3cD'
}

const kovanGif = '/images/l1.gif'
const networks: Networks = {
  '42': {
    chainID: '42',
    name: 'Kovan',
    url: `https://kovan.infura.io/v3/${INFURA_KEY}`,
    gif: kovanGif,
    explorerUrl: 'https://kovan.etherscan.io',
    partnerChainID: '144545313136048',
    tokenBridge: kovan5Bridge,
    blockTime: 5
  },
  '144545313136048': {
    chainID: '144545313136048',
    name: 'Arbitrum-testnet-5',
    gif: '/images/l2.gif',
    url: 'https://kovan5.arbitrum.io/rpc',
    explorerUrl: 'https://explorer5.arbitrum.io/#',
    partnerChainID: '42',
    tokenBridge: kovan5Bridge
  },
  '1': {
    chainID: '1',
    name: 'Mainnet',
    url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
    gif: kovanGif,
    explorerUrl: 'https://etherscan.io',
    partnerChainID: '42161',
    tokenBridge: mainnetBridge,
    blockTime: 15
  },
  '42161': {
    chainID: '42161',
    name: 'Arbitrum One',
    url: 'https://arb1.arbitrum.io/rpc',
    gif: kovanGif,
    explorerUrl: 'https://arbiscan.io',
    partnerChainID: '1',
    tokenBridge: mainnetBridge,
    bridgeUpdateBlockNumber: 224717
  },
  '421611': {
    chainID: '421611',
    name: 'RinkArby',
    url: 'https://rinkeby.arbitrum.io/rpc',
    gif: kovanGif,
    explorerUrl: 'https://testnet.arbiscan.io',
    partnerChainID: '4',
    tokenBridge: RinkebyBridge,
    bridgeUpdateBlockNumber: 2386243
  },
  '4': {
    chainID: '4',
    name: 'Rinkeby',
    url: `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
    gif: kovanGif,
    explorerUrl: 'https://rinkeby.etherscan.io',
    partnerChainID: '421611',
    tokenBridge: RinkebyBridge
  }
}

export const rpcURLs: { [chainId: number]: string } = {
  1: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  4: `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
  5: `https://goerli.infura.io/v3/${INFURA_KEY}`
}

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60

export function registerNitroDevnet() {
  addCustomNetwork({
    customL1Network: {
      blockTime: 15,
      chainID: 5,
      explorerUrl: 'https://goerli.etherscan.io',
      isCustom: true,
      name: 'Goerli',
      partnerChainIDs: [421612],
      rpcURL: rpcURLs[5]
    },
    customL2Network: {
      chainID: 421612,
      confirmPeriodBlocks: 960,
      retryableLifetimeSeconds: SEVEN_DAYS_IN_SECONDS,
      ethBridge: {
        bridge: '0x9903a892da86c1e04522d63b08e5514a921e81df',
        inbox: '0x1fdbbcc914e84af593884bf8e8dd6877c29035a2',
        outboxes: {
          '0xFDF2B11347dA17326BAF30bbcd3F4b09c4719584': 0
        },
        rollup: '0x767CfF8D8de386d7cbe91DbD39675132ba2f5967',
        sequencerInbox: '0xb32f4257e05c56c53d46bbec9e85770eb52425d6'
      },
      explorerUrl: 'https://nitro-devnet-explorer.arbitrum.io',
      isArbitrum: true,
      isCustom: true,
      name: 'Arbitrum Nitro Devnet',
      partnerChainID: 5,
      rpcURL: 'https://nitro-devnet.arbitrum.io/rpc',
      tokenBridge: {
        l1CustomGateway: '0x23D4e0D7Cb7AE7CF745E82262B17eb46535Ae819',
        l1ERC20Gateway: '0x6336C4e811b2f7D17d45b6241Fd47F2E11621Ffb',
        l1GatewayRouter: '0x8BDFa67ace22cE2BFb2fFebe72f0c91CDA694d4b',
        l1MultiCall: '0x90863B80f274b6D2227b01f2c1de4fdCb04896E2',
        l1ProxyAdmin: '0x678cC9702ebF79d741E4f815937475311A58404a',
        l1Weth: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
        l1WethGateway: '0x64bfF696bE6a087A81936b9a2489624015381be4',
        l2CustomGateway: '0x7AC493f26EF26904E52fE46C8DaEE247b9A556B8',
        l2ERC20Gateway: '0xf298434ffE691400b932f4b14B436f451F4CED76',
        l2GatewayRouter: '0xC502Ded1EE1d616B43F7f20Ebde83Be1A275ca3c',
        l2Multicall: '0x1068dbfcc13f3a22fcAe684943AFA43cc66fA689',
        l2ProxyAdmin: '0x1F2715AaC7EeFb75ebCc478f3D9a361fa47A95DD',
        l2Weth: '0x96CfA560e7332DebA750e330fb6f59E2269f40Dd',
        l2WethGateway: '0xf10c7CAA33A3360f60053Bc1081980f62567505F'
      }
    }
  })
}

export default networks
