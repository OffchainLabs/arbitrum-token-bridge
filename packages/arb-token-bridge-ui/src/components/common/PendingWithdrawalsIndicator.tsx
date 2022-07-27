import { useCallback, useMemo } from 'react'
import { twMerge } from 'tailwind-merge'
import Loader from 'react-loader-spinner'

import { useAppState } from '../../state'
import { PendingWithdrawalsLoadedState } from '../../util'
import { useAppContextDispatch, useAppContextState } from '../App/AppContext'

export function usePendingWithdrawalsIndicator() {
  const { app } = useAppState()
  const { pwLoadedState } = app

  const { layout } = useAppContextState()
  const { isPendingWithdrawalsIndicatorVisible } = layout

  const dispatch = useAppContextDispatch()

  const hide = useCallback(() => {
    // Don't hide indicator while loading
    if (pwLoadedState !== PendingWithdrawalsLoadedState.LOADING) {
      dispatch({ type: 'layout.hide_pending_withdrawals_indicator' })
    }
  }, [dispatch, pwLoadedState])

  return { isVisible: isPendingWithdrawalsIndicatorVisible, hide }
}

export type PendingWithdrawalsIndicatorProps = {
  loaderProps?: { width: number; height: number }
  className?: string
}

export function PendingWithdrawalsIndicator({
  loaderProps = { width: 14, height: 14 },
  className = ''
}: PendingWithdrawalsIndicatorProps) {
  const { app } = useAppState()
  const { pwLoadedState, withdrawalsTransformed } = app

  const amount = useMemo(
    () =>
      withdrawalsTransformed.filter(
        tx => tx.status === 'Unconfirmed' || tx.status === 'Confirmed'
      ).length,
    [withdrawalsTransformed]
  )

  if (pwLoadedState === PendingWithdrawalsLoadedState.READY && amount === 0) {
    return null
  }

  const bgClassName =
    pwLoadedState === PendingWithdrawalsLoadedState.LOADING
      ? 'bg-white'
      : 'bg-brick'

  return (
    <div
      className={twMerge(
        'flex items-center justify-center rounded-full border-white transition-colors',
        bgClassName,
        className
      )}
    >
      {pwLoadedState === PendingWithdrawalsLoadedState.LOADING && (
        <Loader type="TailSpin" color="black" {...loaderProps} />
      )}

      {pwLoadedState === PendingWithdrawalsLoadedState.READY && (
        <span>{amount}</span>
      )}
    </div>
  )
}
