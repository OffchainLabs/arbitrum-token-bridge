import { getArbitrumNetwork } from '@arbitrum/sdk'
import { ChainWithRpcUrl } from '../../util/networks'

export function createMockOrbitChain({
  chainId,
  parentChainId
}: {
  chainId: number
  parentChainId: number
}): ChainWithRpcUrl {
  const isTestnet =
    parentChainId === 1 ? false : getArbitrumNetwork(parentChainId).isTestnet

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
    isTestnet,
    name: `Mocked Orbit Chain ${chainId}`,
    slug: `mocked-orbit-chain-${chainId}`,
    parentChainId
  }
}
