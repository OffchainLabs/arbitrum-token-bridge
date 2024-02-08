import { constants } from '@arbitrum/sdk'

import { ChainWithRpcUrl } from '../../util/networks'

export function createMockOrbitChain({
  chainId,
  parentChainId
}: {
  chainId: number
  parentChainId: number
}): ChainWithRpcUrl {
  return {
    chainID: chainId,
    confirmPeriodBlocks: 45818,
    ethBridge: {
      bridge: '',
      inbox: '',
      outbox: '',
      rollup: '',
      sequencerInbox: ''
    },
    nativeToken: '',
    explorerUrl: '',
    rpcUrl: '',
    isArbitrum: true,
    isCustom: true,
    name: `Mocked Orbit Chain ${chainId}`,
    slug: `mocked-orbit-chain-${chainId}`,
    partnerChainID: parentChainId,
    partnerChainIDs: [],
    retryableLifetimeSeconds: 604800,
    tokenBridge: {
      l1CustomGateway: '',
      l1ERC20Gateway: '',
      l1GatewayRouter: '',
      l1MultiCall: '',
      l1ProxyAdmin: '',
      l1Weth: '',
      l1WethGateway: '',
      l2CustomGateway: '',
      l2ERC20Gateway: '',
      l2GatewayRouter: '',
      l2Multicall: '',
      l2ProxyAdmin: '',
      l2Weth: '',
      l2WethGateway: ''
    },
    nitroGenesisBlock: 0,
    nitroGenesisL1Block: 0,
    depositTimeout: 1800000,
    blockTime: constants.ARB_MINIMUM_BLOCK_TIME_IN_SECONDS
  }
}
