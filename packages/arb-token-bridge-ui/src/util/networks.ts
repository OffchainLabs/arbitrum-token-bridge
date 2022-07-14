import { L1Network, L2Network, addCustomNetwork } from '@arbitrum/sdk'
import { l1Networks } from '@arbitrum/sdk-nitro/dist/lib/dataEntities/networks'

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
  421612: 'https://nitro-devnet.arbitrum.io/rpc',
  42170: 'https://a4ba.arbitrum.io/rpc'
}

l1Networks[1].rpcURL = rpcURLs[1]
l1Networks[4].rpcURL = rpcURLs[4]

export const l2DaiGatewayAddresses: { [chainId: number]: string } = {
  42161: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65',
  421611: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65'
}

const AnyTrust: L2Network = {
  chainID: 42170,
  confirmPeriodBlocks: 20,
  ethBridge: {
    bridge: '0xc1ebd02f738644983b6c4b2d440b8e77dde276bd',
    inbox: '0xc4448b71118c9071bcb9734a0eac55d18a153949',
    outbox: '0xD4B80C3D7240325D18E645B49e6535A3Bf95cc58',
    rollup: '0xfb209827c58283535b744575e11953dcc4bead88',
    sequencerInbox: '0x211e1c4c7f1bf5351ac850ed10fd68cffcf6c21b'
  },
  explorerUrl: 'https://a4ba-explorer.arbitrum.io',
  isArbitrum: true,
  isCustom: true,
  name: 'AnyTrust',
  partnerChainID: 1,
  retryableLifetimeSeconds: SEVEN_DAYS_IN_SECONDS,
  rpcURL: 'https://a4ba.arbitrum.io/rpc',
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
  }
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

const DeprecatedNitroDevnet: L2Network = {
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

const NewNitroDevnet: L2Network = {
  chainID: 421613,
  confirmPeriodBlocks: 960,
  retryableLifetimeSeconds: SEVEN_DAYS_IN_SECONDS,
  // TODO update all addresses:
  ethBridge: {
    bridge: '0xaf4159a80b6cc41ed517db1c453d1ef5c2e4db72',
    inbox: '0x6BEbC4925716945D46F0Ec336D5C2564F419682C',
    outbox: '0x45Af9Ed1D03703e480CE7d328fB684bb67DA5049',
    rollup: '0x45e5cAea8768F42B385A366D3551Ad1e0cbFAb17',
    sequencerInbox: '0x0484A87B144745A2E5b7c359552119B6EA2917A9'
  },
  explorerUrl: 'https://nitro-devnet-explorer.arbitrum.io',
  isArbitrum: true,
  isCustom: true,
  name: "Arbitrum Rollup Goerli Testnet",
  partnerChainID: 5,
  rpcURL: 'https://goerli-rollup.arbitrum.io/rpc',
  tokenBridge: {
    l1CustomGateway: '0x9fDD1C4E4AA24EEc1d913FABea925594a20d43C7',
    l1ERC20Gateway: '0x715D99480b77A8d9D603638e593a539E21345FdF',
    l1GatewayRouter: '0x4c7708168395aEa569453Fc36862D2ffcDaC588c',
    l1MultiCall: '0xa0A8537a683B49ba4bbE23883d984d4684e0acdD',
    l1ProxyAdmin: '0x16101A84B00344221E2983190718bFAba30D9CeE',
    l1Weth: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    l1WethGateway: '0x6e244cD02BBB8a6dbd7F626f05B2ef82151Ab502',
    l2CustomGateway: '0x8b6990830cF135318f75182487A4D7698549C717',
    l2ERC20Gateway: '0x2eC7Bc552CE8E51f098325D2FcF0d3b9d3d2A9a2',
    l2GatewayRouter: '0xE5B9d8d42d656d1DcB8065A6c012FE3780246041',
    l2Multicall: '0x108B25170319f38DbED14cA9716C54E5D1FF4623',
    l2ProxyAdmin: '0xeC377B42712608B0356CC54Da81B2be1A4982bAb',
    l2Weth: '0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3',
    l2WethGateway: '0xf9F2e89c8347BD96742Cc07095dee490e64301d6'
  }
}

export function registerAnyTrust() {
  addCustomNetwork({ customL2Network: AnyTrust })
}

export function registerNitroDevnet() {
  addCustomNetwork({
    customL1Network: Goerli,
    customL2Network: DeprecatedNitroDevnet
  })
}

export function registerNewNitroDevnet() {
  addCustomNetwork({ customL1Network: Goerli, customL2Network: NewNitroDevnet })
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

    rpcURLs[customL1Network.chainID] = customL1Network.rpcURL
    rpcURLs[customL2Network.chainID] = customL2Network.rpcURL

    addCustomNetwork({ customL1Network, customL2Network })
  } catch (error: any) {
    console.error(`Failed to register local network: ${error.message}`)
  }
}
