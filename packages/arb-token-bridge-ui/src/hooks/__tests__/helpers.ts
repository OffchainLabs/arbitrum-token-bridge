import { vi } from 'vitest'
import { getArbitrumNetwork } from '@arbitrum/sdk'
import { ChainWithRpcUrl } from '../../util/networks'
import {
  PartialLocation,
  QueryParamAdapter,
  QueryParamAdapterComponent
} from 'use-query-params'

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

/** Taken from https://github.com/pbeshai/use-query-params/blob/master/packages/use-query-params/src/__tests__/helpers.ts */
type QueryParamAdapterComponentWithQueryParamAdapter =
  QueryParamAdapterComponent & {
    adapter: QueryParamAdapter
  }
export function makeMockAdapter(
  currentLocation: PartialLocation
): QueryParamAdapterComponentWithQueryParamAdapter {
  const adapter: QueryParamAdapter = {
    replace: vi
      .fn()
      .mockImplementation(newLocation =>
        Object.assign(currentLocation, newLocation)
      ),
    push: vi
      .fn()
      .mockImplementation(newLocation =>
        Object.assign(currentLocation, newLocation)
      ),
    get location() {
      return currentLocation
    }
  }

  const Adapter: QueryParamAdapterComponentWithQueryParamAdapter = ({
    children
  }) => children(adapter)
  Adapter.adapter = adapter

  return Adapter
}
