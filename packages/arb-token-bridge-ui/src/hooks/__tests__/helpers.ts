import { ChainWithRpcUrl } from '../../util/networks'

export function createMockOrbitChain({
  chainId,
  parentChainId
}: {
  chainId: number
  parentChainId: number
}): ChainWithRpcUrl {
  return {
    chainId: chainId,
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
    isCustom: true,
    name: `Mocked Orbit Chain ${chainId}`,
    slug: `mocked-orbit-chain-${chainId}`,
    parentChainId,
    retryableLifetimeSeconds: 604800
  }
}
