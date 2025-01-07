import { renderHook } from '@testing-library/react'

import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { useNetworks } from '../useNetworks'
import { ChainId } from '../../util/networks'
import { useBalances } from '../useBalances'
import { useSelectedTokenBalances } from '../TransferPanel/useSelectedTokenBalances'
import { BigNumber } from 'ethers'

jest.mock('../useNetworks', () => ({
  useNetworks: jest.fn()
}))

jest.mock('../useBalances', () => ({
  useBalances: jest.fn()
}))

describe('useSelectedTokenBalances', () => {
  const mockedUseNetworks = jest.mocked(useNetworks)
  const mockedUseBalances = jest.mocked(useBalances)

  it('should return native USDC address on Sepolia when source chain is Sepolia and destination chain is Arbitrum Sepolia', () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Sepolia),
        sourceChainProvider: getProviderForChainId(ChainId.Sepolia),
        destinationChain: getWagmiChain(ChainId.ArbitrumSepolia),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia)
      },
      jest.fn()
    ])

    mockedUseBalances.mockReturnValue({
      ethParentBalance: BigNumber.from(0.1),
      erc20ParentBalances: { '0x123': BigNumber.from(0.2) },
      ethChildBalance: BigNumber.from(0.3),
      erc20ChildBalances: { '0x123': BigNumber.from(0.4) },
      updateEthChildBalance: jest.fn(),
      updateEthParentBalance: jest.fn(),
      updateErc20ParentBalances: jest.fn(),
      updateErc20ChildBalances: jest.fn()
    })

    const { result } = renderHook(useSelectedTokenBalances)
    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(0.2),
      destinationBalance: BigNumber.from(0.4)
    })
  })
})
