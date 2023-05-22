import { RenderHookResult, act, renderHook } from '@testing-library/react'
import { BigNumber } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { KeyedMutator } from 'swr'

import { Erc20Balances, UseBalanceProps, useBalance } from '../useBalance'

type RenderHookResultResultType = {
  eth: readonly [BigNumber | null, KeyedMutator<BigNumber>]
  erc20: readonly [
    Erc20Balances | null,
    (addresses: string[]) => Promise<Erc20Balances | undefined>
  ]
}

// this method is suggested by https://stackoverflow.com/a/73476929/5143717
export const renderHookAsync = async ({
  provider,
  walletAddress,
  wrapper
}: {
  provider: Provider
  walletAddress: string | undefined
  wrapper: React.ComponentType
}) => {
  let hook:
    | RenderHookResult<RenderHookResultResultType, UseBalanceProps>
    | undefined

  await act(async () => {
    hook = renderHook(
      () =>
        useBalance({
          provider,
          walletAddress
        }),
      { wrapper }
    )
  })

  if (!hook) {
    throw new Error('Hook is not defined')
  }

  const { result } = hook
  return { result }
}
