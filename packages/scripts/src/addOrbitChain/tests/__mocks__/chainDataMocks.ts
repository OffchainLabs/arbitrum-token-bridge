import { Issue, IncomingChainData, OrbitChain } from "../../schemas";

export const mockIssue: Issue = {
  body: `
### Chain ID
42161

### Chain name
Test Chain

### Not required
_No response_
  `,
  state: "open",
  html_url: "https://github.com/example/repo/issues/1",
};

export const fullMockIssue: Issue = {
  body: `
### Chain ID
42161

### Chain name
Test Chain

### Chain description
A test chain.

### Chain logo
https://example.com/logo.png

### Brand color
#FF0000

### RPC URL
https://rpc.example.com

### Explorer URL
https://explorer.example.com

### Parent chain ID
1

### Is this a testnet?
Yes

### confirmPeriodBlocks
100

### Native token address
0x0000000000000000000000000000000000000001

### Native token name
Test Token

### Native token symbol
TST

### Native token logo
https://example.com/token-logo.png

### bridge
0x0000000000000000000000000000000000000002

### inbox
0x0000000000000000000000000000000000000003

### outbox
0x0000000000000000000000000000000000000004

### rollup
0x0000000000000000000000000000000000000005

### sequencerInbox
0x0000000000000000000000000000000000000006

### Parent Custom Gateway
0x0000000000000000000000000000000000000007

### Parent ERC20 Gateway
0x0000000000000000000000000000000000000008

### Parent Gateway Router
0x0000000000000000000000000000000000000009

### Parent MultiCall
0x000000000000000000000000000000000000000A

### Parent Proxy Admin
0x000000000000000000000000000000000000000B

### Parent WETH
0x000000000000000000000000000000000000000C

### Parent WETH Gateway
0x000000000000000000000000000000000000000D

### Child Custom Gateway
0x000000000000000000000000000000000000000E

### Child ERC20 Gateway
0x000000000000000000000000000000000000000F

### Child Gateway Router
0x0000000000000000000000000000000000000010

### Child Multicall
0x0000000000000000000000000000000000000011

### Child Proxy Admin
0x0000000000000000000000000000000000000012

### Child WETH
0x0000000000000000000000000000000000000013

### Child WETH Gateway
0x0000000000000000000000000000000000000014
  `,
  state: "open",
  html_url: "https://github.com/example/repo/issues/1",
};

export const mockRawData = {
  chainId: "42161",
  name: "Test Chain",
  description: "A test chain.",
  chainLogo: "https://example.com/logo.png",
  color: "#FF0000",
  rpcUrl: "https://rpc.example.com",
  explorerUrl: "https://explorer.example.com",
  parentChainId: "1",
  confirmPeriodBlocks: "100",
  nativeTokenAddress: "0x0000000000000000000000000000000000000001",
  nativeTokenName: "Test Token",
  nativeTokenSymbol: "TST",
  nativeTokenLogo: "https://example.com/token-logo.png",
  bridge: "0x0000000000000000000000000000000000000002",
  inbox: "0x0000000000000000000000000000000000000003",
  outbox: "0x0000000000000000000000000000000000000004",
  rollup: "0x0000000000000000000000000000000000000005",
  sequencerInbox: "0x0000000000000000000000000000000000000006",
  parentCustomGateway: "0x0000000000000000000000000000000000000007",
  parentErc20Gateway: "0x0000000000000000000000000000000000000008",
  parentGatewayRouter: "0x0000000000000000000000000000000000000009",
  parentMulticall: "0x000000000000000000000000000000000000000A",
  parentProxyAdmin: "0x000000000000000000000000000000000000000B",
  parentWeth: "0x000000000000000000000000000000000000000C",
  parentWethGateway: "0x000000000000000000000000000000000000000D",
  childCustomGateway: "0x000000000000000000000000000000000000000E",
  childErc20Gateway: "0x000000000000000000000000000000000000000F",
  childGatewayRouter: "0x0000000000000000000000000000000000000010",
  childMulticall: "0x0000000000000000000000000000000000000011",
  childProxyAdmin: "0x0000000000000000000000000000000000000012",
  childWeth: "0x0000000000000000000000000000000000000013",
  childWethGateway: "0x0000000000000000000000000000000000000014",
};

export const mockAddresses = {
  bridge: "0x1234",
  inbox: "0x5678",
  outbox: "0x9ABC",
  rollup: "0xDEF0",
  sequencerInbox: "0x1111",
  parentCustomGateway: "0x2222",
  parentErc20Gateway: "0x3333",
  parentGatewayRouter: "0x4444",
  parentMulticall: "0x5555",
  parentProxyAdmin: "0x6666",
  parentWeth: "0x7777",
  parentWethGateway: "0x8888",
  childCustomGateway: "0x9999",
  childErc20Gateway: "0xAAAA",
  childGatewayRouter: "0xBBBB",
  childMulticall: "0xCCCC",
  childProxyAdmin: "0xDDDD",
  childWeth: "0xEEEE",
  childWethGateway: "0xFFFF",
};

export const mockIncomingChainData: IncomingChainData = {
  chainId: "1234567890",
  name: "Test Chain",
  description: "This is a test chain.",
  chainLogo: "https://example.com/testchain.png",
  color: "#FF0000",
  rpcUrl: "https://testrpc.com",
  explorerUrl: "https://testexplorer.com",
  parentChainId: "421614",
  isTestnet: true,
  confirmPeriodBlocks: "150",
  nativeTokenAddress: "0x0000000000000000000000000000000000000006",
  nativeTokenName: "Test Token",
  nativeTokenSymbol: "TEST",
  nativeTokenLogo: "https://example.com/testtoken.png",
  bridge: "0x0000000000000000000000000000000000000001",
  inbox: "0x0000000000000000000000000000000000000002",
  outbox: "0x0000000000000000000000000000000000000003",
  rollup: "0x0000000000000000000000000000000000000004",
  sequencerInbox: "0x0000000000000000000000000000000000000005",
  parentGatewayRouter: "0x0000000000000000000000000000000000000009",
  childGatewayRouter: "0x0000000000000000000000000000000000000016",
  parentErc20Gateway: "0x0000000000000000000000000000000000000008",
  childErc20Gateway: "0x0000000000000000000000000000000000000015",
  parentCustomGateway: "0x0000000000000000000000000000000000000007",
  childCustomGateway: "0x0000000000000000000000000000000000000014",
  parentWethGateway: "0x0000000000000000000000000000000000000013",
  childWethGateway: "0x0000000000000000000000000000000000000020",
  parentWeth: "0x0000000000000000000000000000000000000012",
  childWeth: "0x0000000000000000000000000000000000000019",
  parentProxyAdmin: "0x0000000000000000000000000000000000000011",
  childProxyAdmin: "0x0000000000000000000000000000000000000018",
  parentMulticall: "0x0000000000000000000000000000000000000010",
  childMulticall: "0x0000000000000000000000000000000000000017",
};

export const mockOrbitChain: OrbitChain = {
  chainId: 660279,
  confirmPeriodBlocks: 45818,
  ethBridge: {
    bridge: "0x7dd8A76bdAeBE3BBBaCD7Aa87f1D4FDa1E60f94f",
    inbox: "0xaE21fDA3de92dE2FDAF606233b2863782Ba046F9",
    outbox: "0x1E400568AD4840dbE50FB32f306B842e9ddeF726",
    rollup: "0xC47DacFbAa80Bd9D8112F4e8069482c2A3221336",
    sequencerInbox: "0x995a9d3ca121D48d21087eDE20bc8acb2398c8B1",
  },
  nativeToken: "0x4Cb9a7AE498CEDcBb5EAe9f25736aE7d428C9D66",
  explorerUrl: "https://explorer.xai-chain.net",
  rpcUrl: "https://xai-chain.net/rpc",
  isArbitrum: true,
  isCustom: true,
  isTestnet: false,
  name: "Xai",
  slug: "xai",
  parentChainId: 42161,
  partnerChainIDs: [],
  retryableLifetimeSeconds: 604800,
  tokenBridge: {
    parentGatewayRouter: "0x22CCA5Dc96a4Ac1EC32c9c7C5ad4D66254a24C35",
    childGatewayRouter: "0xd096e8dE90D34de758B0E0bA4a796eA2e1e272cF",
    parentErc20Gateway: "0xb591cE747CF19cF30e11d656EB94134F523A9e77",
    childErc20Gateway: "0x0c71417917D24F4A6A6A55559B98c5cCEcb33F7a",
    parentCustomGateway: "0xb15A0826d65bE4c2fDd961b72636168ee70Af030",
    childCustomGateway: "0x96551194230725c72ACF8E9573B1382CCBC70635",
    parentWethGateway: "0x0000000000000000000000000000000000000000",
    childWethGateway: "0x0000000000000000000000000000000000000000",
    childWeth: "0x0000000000000000000000000000000000000000",
    parentProxyAdmin: "0x041f85dd87c46b941dc9b15c6628b19ee5358485",
    childProxyAdmin: "0x56800fDCFbE19Ea3EE9d115dAC30d95d6459c44E",
    parentMulticall: "0x90B02D9F861017844F30dFbdF725b6aa84E63822",
    childMulticall: "0xEEC168551A85911Ec3A905e0561b656979f3ea67",
  },
  nitroGenesisBlock: 0,
  nitroGenesisL1Block: 0,
  depositTimeout: 1800000,
  blockTime: 0.25,
  bridgeUiConfig: {
    color: "#F30019",
    network: {
      name: "Xai",
      logo: "/images/XaiLogo.svg",
      description: "A chain for Web2 and Web3 gamers to play blockchain games.",
    },
    nativeTokenData: {
      name: "Xai",
      symbol: "XAI",
      decimals: 18,
      logoUrl: "/images/XaiLogo.svg",
    },
  },
};
