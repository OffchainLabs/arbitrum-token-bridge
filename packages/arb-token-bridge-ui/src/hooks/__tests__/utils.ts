import { RenderHookResult, act, renderHook } from '@testing-library/react'

import { UseBalanceProps, useBalance } from '../useBalance'

export const renderHookAsyncUseBalance = async ({
  provider,
  walletAddress,
  wrapper
}: UseBalanceProps & {
  wrapper: React.ComponentType
}) =>
  renderHookAsync({
    hookFunction: useBalance,
    hookFunctionProps: {
      provider,
      walletAddress
    },
    wrapper
  })

// this method is suggested by https://stackoverflow.com/a/73476929/5143717
export const renderHookAsync = async <
  HookFunction extends (p: HookFunctionProps) => any,
  HookFunctionProps extends Record<string, any>
>({
  hookFunction,
  hookFunctionProps,
  wrapper
}: {
  hookFunction: HookFunction
  hookFunctionProps: HookFunctionProps
  wrapper: React.ComponentType
}) => {
  let hook:
    | RenderHookResult<
        ReturnType<typeof hookFunction>,
        typeof hookFunctionProps
      >
    | undefined

  await act(async () => {
    hook = renderHook(() => hookFunction(hookFunctionProps), { wrapper })
  })

  if (!hook) {
    throw new Error('Hook is not defined')
  }

  const { result } = hook
  return { result }
}
