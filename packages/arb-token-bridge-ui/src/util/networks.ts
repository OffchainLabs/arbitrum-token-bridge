import { L1Network, L2Network, addCustomNetwork } from '@arbitrum/sdk'
import EthereumLogo from '../../assets/EthereumLogo.png'
import ArbitrumOneLogo from '../../assets/ArbitrumOneLogo.svg'
import ArbitrumNovaLogo from '../../assets/ArbitrumNovaLogo.png'

const INFURA_KEY = process.env.REACT_APP_INFURA_KEY as string

if (!INFURA_KEY) {
  throw new Error('Infura API key not provided')
}

export enum ChainId {
  Mainnet = 1,
  Rinkeby = 4,
  Goerli = 5,
  ArbitrumOne = 42161,
  ArbitrumNova = 42170,
  ArbitrumRinkeby = 421611,
  ArbitrumGoerli = 421613
}

export const rpcURLs: { [chainId: number]: string } = {
  // L1
  [ChainId.Mainnet]:
    process.env.REACT_APP_ETHEREUM_RPC_URL ||
    `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  // L1 Testnets
  [ChainId.Rinkeby]:
    process.env.REACT_APP_RINKEBY_RPC_URL ||
    `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
  [ChainId.Goerli]:
    process.env.REACT_APP_GOERLI_RPC_URL ||
    `https://goerli.infura.io/v3/${INFURA_KEY}`,
  // L2
  [ChainId.ArbitrumOne]: 'https://arb1.arbitrum.io/rpc',
  [ChainId.ArbitrumNova]: 'https://nova.arbitrum.io/rpc',
  // L2 Testnets
  [ChainId.ArbitrumRinkeby]: 'https://rinkeby.arbitrum.io/rpc',
  [ChainId.ArbitrumGoerli]: 'https://goerli-rollup.arbitrum.io/rpc'
}

export const l2DaiGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumOne]: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65',
  [ChainId.ArbitrumNova]: '0x10E6593CDda8c58a1d0f14C5164B376352a55f2F',
  [ChainId.ArbitrumRinkeby]: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65'
}

export const l2wstETHGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumRinkeby]: '0x65321bf24210b81500230dcece14faa70a9f50a7',
  [ChainId.ArbitrumOne]: '0x07d4692291b9e30e326fd31706f686f83f331b82'
}

export const l2LptGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumOne]: '0x6D2457a4ad276000A615295f7A80F79E48CcD318'
}

// Default L2 Chain to use for a certain chainId
export const chainIdToDefaultL2ChainId: { [chainId: number]: ChainId[] } = {
  [ChainId.ArbitrumGoerli]: [ChainId.ArbitrumGoerli],
  [ChainId.ArbitrumNova]: [ChainId.ArbitrumNova],
  [ChainId.ArbitrumOne]: [ChainId.ArbitrumOne],
  [ChainId.ArbitrumRinkeby]: [ChainId.ArbitrumRinkeby],
  [ChainId.Goerli]: [ChainId.ArbitrumGoerli],
  [ChainId.Mainnet]: [ChainId.ArbitrumOne, ChainId.ArbitrumNova],
  [ChainId.Rinkeby]: [ChainId.ArbitrumRinkeby]
}

export function registerLocalNetwork() {
  let localNetwork: {
    l1Network: L1Network
    l2Network: L2Network
  }

  try {
    // Generate the "localNetwork.json" file by running "yarn gen:network" in @arbitrum/sdk and then copy it over.
    localNetwork = require('./localNetwork.json')
  } catch (error) {
    return console.warn(
      `Skipping local network registration as no "localNetwork.json" file was found.`
    )
  }

  try {
    const customL1Network = localNetwork.l1Network
    const customL2Network = localNetwork.l2Network

    rpcURLs[customL1Network.chainID] =
      process.env.REACT_APP_LOCAL_ETHEREUM_RPC_URL || ''
    rpcURLs[customL2Network.chainID] =
      process.env.REACT_APP_LOCAL_ARBITRUM_RPC_URL || ''

    chainIdToDefaultL2ChainId[customL1Network.chainID] = [
      customL2Network.chainID
    ]
    chainIdToDefaultL2ChainId[customL2Network.chainID] = [
      customL2Network.chainID
    ]

    addCustomNetwork({ customL1Network, customL2Network })
  } catch (error: any) {
    console.error(`Failed to register local network: ${error.message}`)
  }
}

export function isNetwork(network: L1Network | L2Network) {
  const chainId = network.chainID

  return {
    // L1
    isMainnet: chainId === ChainId.Mainnet,
    // L1 Testnets
    isRinkeby: chainId === ChainId.Rinkeby,
    isGoerli: chainId === ChainId.Goerli,
    // L2
    isArbitrum: Boolean((network as any).isArbitrum),
    isArbitrumOne: chainId === ChainId.ArbitrumOne,
    isArbitrumNova: chainId === ChainId.ArbitrumNova,
    // L2 Testnets
    isArbitrumRinkeby: chainId === ChainId.ArbitrumRinkeby,
    isArbitrumGoerliRollup: chainId === ChainId.ArbitrumGoerli
  }
}

export function getNetworkName(
  chainIdOrNetwork: number | L1Network | L2Network
) {
  let chainId: number

  if (typeof chainIdOrNetwork === 'number') {
    chainId = chainIdOrNetwork
  } else {
    chainId = chainIdOrNetwork.chainID
  }

  switch (chainId) {
    case ChainId.Mainnet:
      return 'Mainnet'

    case ChainId.Rinkeby:
      return 'Rinkeby'

    case ChainId.Goerli:
      return 'Goerli'

    case ChainId.ArbitrumOne:
      return 'Arbitrum One'

    case ChainId.ArbitrumNova:
      return 'Arbitrum Nova'

    case ChainId.ArbitrumRinkeby:
      return 'Arbitrum Rinkeby'

    case ChainId.ArbitrumGoerli:
      return 'Arbitrum Goerli'

    default:
      return 'Unknown'
  }
}

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60

const mainnetTokenBridge = {
  l1GatewayRouter: '0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef',
  l2GatewayRouter: '0x5288c571Fd7aD117beA99bF60FE0846C4E84F933',
  l1ERC20Gateway: '0xa3A7B6F88361F48403514059F1F16C8E78d60EeC',
  l2ERC20Gateway: '0x09e9222E96E7B4AE2a407B98d48e330053351EEe',
  l1CustomGateway: '0xcEe284F754E854890e311e3280b767F80797180d',
  l2CustomGateway: '0x096760F208390250649E3e8763348E783AEF5562',
  l1WethGateway: '0xd92023E9d9911199a6711321D1277285e6d4e2db',
  l2WethGateway: '0x6c411aD3E74De3E7Bd422b94A27770f5B86C623B',
  l2Weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  l1Weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  l1ProxyAdmin: '0x9aD46fac0Cf7f790E5be05A0F15223935A0c0aDa',
  l2ProxyAdmin: '0xd570aCE65C43af47101fC6250FD6fC63D1c22a86',
  l1MultiCall: '0x5ba1e12693dc8f9c48aad8770482f4739beed696',
  l2Multicall: '0x842eC2c7D803033Edf55E478F461FC547Bc54EB2'
}

const mainnetETHBridge = {
  bridge: '0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a',
  inbox: '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f',
  sequencerInbox: '0x1c479675ad559DC151F6Ec7ed3FbF8ceE79582B6',
  outbox: '0x0B9857ae2D4A3DBe74ffE1d7DF045bb7F96E4840',
  rollup: '0x5eF0D09d1E6204141B4d37530808eD19f60FBa35',
  classicOutboxes: {
    '0x667e23ABd27E623c11d4CC00ca3EC4d0bD63337a': 0,
    '0x760723CD2e632826c38Fef8CD438A4CC7E7E1A40': 30
  }
}

export const networksList: { [chainId: number]: L1Network | L2Network } = {
  [ChainId.ArbitrumOne]: {
    chainID: 42161,
    name: 'Arbitrum One',
    explorerUrl: 'https://arbiscan.io',
    partnerChainID: 1,
    isArbitrum: true,
    tokenBridge: mainnetTokenBridge,
    ethBridge: mainnetETHBridge,
    confirmPeriodBlocks: 45818,
    isCustom: false,
    retryableLifetimeSeconds: SEVEN_DAYS_IN_SECONDS,
    nitroGenesisBlock: 22207817,
    /**
     * Finalisation on mainnet can be up to 2 epochs = 64 blocks on mainnet
     */
    depositTimeout: 888000
  },
  [ChainId.ArbitrumNova]: {
    chainID: 42170,
    confirmPeriodBlocks: 45818,
    ethBridge: {
      bridge: '0xc1ebd02f738644983b6c4b2d440b8e77dde276bd',
      inbox: '0xc4448b71118c9071bcb9734a0eac55d18a153949',
      outbox: '0xD4B80C3D7240325D18E645B49e6535A3Bf95cc58',
      rollup: '0xfb209827c58283535b744575e11953dcc4bead88',
      sequencerInbox: '0x211e1c4c7f1bf5351ac850ed10fd68cffcf6c21b'
    },
    explorerUrl: 'https://nova-explorer.arbitrum.io',
    isArbitrum: true,
    isCustom: false,
    name: 'Arbitrum Nova',
    partnerChainID: 1,
    retryableLifetimeSeconds: SEVEN_DAYS_IN_SECONDS,
    tokenBridge: {
      l1CustomGateway: '0x23122da8C581AA7E0d07A36Ff1f16F799650232f',
      l1ERC20Gateway: '0xB2535b988dcE19f9D71dfB22dB6da744aCac21bf',
      l1GatewayRouter: '0xC840838Bc438d73C16c2f8b22D2Ce3669963cD48',
      l1MultiCall: '0x8896d23afea159a5e9b72c9eb3dc4e2684a38ea3',
      l1ProxyAdmin: '0xa8f7DdEd54a726eB873E98bFF2C95ABF2d03e560',
      l1Weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      l1WethGateway: '0xE4E2121b479017955Be0b175305B35f312330BaE',
      l2CustomGateway: '0xbf544970E6BD77b21C6492C281AB60d0770451F4',
      l2ERC20Gateway: '0xcF9bAb7e53DDe48A6DC4f286CB14e05298799257',
      l2GatewayRouter: '0x21903d3F8176b1a0c17E953Cd896610Be9fFDFa8',
      l2Multicall: '0x5e1eE626420A354BbC9a95FeA1BAd4492e3bcB86',
      l2ProxyAdmin: '0xada790b026097BfB36a5ed696859b97a96CEd92C',
      l2Weth: '0x722E8BdD2ce80A4422E880164f2079488e115365',
      l2WethGateway: '0x7626841cB6113412F9c88D3ADC720C9FAC88D9eD'
    },
    nitroGenesisBlock: 0,
    depositTimeout: 888000
  },
  [ChainId.Mainnet]: {
    chainID: ChainId.Mainnet,
    name: 'Ethereum Mainnet',
    explorerUrl: 'https://etherscan.io',
    partnerChainIDs: [42161, 42170],
    blockTime: 14,
    isCustom: false,
    isArbitrum: false
  }
}

export const networksListArray = Object.keys(networksList)
  .map((chainId: string) => networksList[Number(chainId)])
  .sort((a, b) => (a.isArbitrum > b.isArbitrum ? -1 : 1)) // sort l2 networks together, before l1

export const networkStyleMap: {
  [chainId: number]: { img: string; btnThemeClass: string }
} = {
  [ChainId.Mainnet]: {
    img: EthereumLogo,
    btnThemeClass: 'bg-blue-arbitrum'
  },
  [ChainId.ArbitrumOne]: {
    img: ArbitrumOneLogo,
    btnThemeClass: 'bg-blue-arbitrum'
  },
  [ChainId.ArbitrumNova]: {
    img: ArbitrumNovaLogo,
    btnThemeClass: 'bg-brick-dark'
  }
}
