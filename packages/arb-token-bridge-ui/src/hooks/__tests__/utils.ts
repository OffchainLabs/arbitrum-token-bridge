import { RenderHookResult, act, renderHook } from '@testing-library/react'

import { UseBalanceProps, useBalance } from '../useBalance'

// this method is suggested by https://stackoverflow.com/a/73476929/5143717
export const renderHookAsync = async ({
  provider,
  walletAddress,
  wrapper
}: UseBalanceProps & {
  wrapper: React.ComponentType
}) => {
  let hook:
    | RenderHookResult<ReturnType<typeof useBalance>, UseBalanceProps>
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
