import { L1Network, L2Network, addCustomNetwork } from '@arbitrum/sdk'

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60
const INFURA_KEY = process.env.REACT_APP_INFURA_KEY as string

if (!INFURA_KEY) {
  throw new Error('Infura API key not provided')
}

export const rpcURLs: { [chainId: number]: string } = {
  1: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  4: `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
  5: `https://goerli.infura.io/v3/${INFURA_KEY}`,
  42161: 'https://arb1.arbitrum.io/rpc',
  421611: 'https://rinkeby.arbitrum.io/rpc',
  421612: 'https://nitro-devnet.arbitrum.io/rpc'
}

export const l2DaiGatewayAddresses: { [chainId: number]: string } = {
  42161: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65',
  421611: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65'
}

const Goerli: L1Network = {
  blockTime: 15,
  chainID: 5,
  explorerUrl: 'https://goerli.etherscan.io',
  isCustom: true,
  name: 'Goerli',
  partnerChainIDs: [421612],
  rpcURL: rpcURLs[5]
}

const NitroDevnet: L2Network = {
  chainID: 421612,
  confirmPeriodBlocks: 960,
  retryableLifetimeSeconds: SEVEN_DAYS_IN_SECONDS,
  ethBridge: {
    bridge: '0x9903a892da86c1e04522d63b08e5514a921e81df',
    inbox: '0x1fdbbcc914e84af593884bf8e8dd6877c29035a2',
    outbox: '0xFDF2B11347dA17326BAF30bbcd3F4b09c4719584',
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

export function registerNitroDevnet() {
  addCustomNetwork({ customL1Network: Goerli, customL2Network: NitroDevnet })
}
