import { useEffect, useMemo, useState } from 'react'
import useLocalStorage from '@rehooks/local-storage'

import { TransferPanel } from '../TransferPanel/TransferPanel'
import { TransactionHistory } from '../TransactionHistory/TransactionHistory'
import { SidePanel } from '../common/SidePanel'
import { useAppContextActions, useAppContextState } from '../App/AppContext'
import { useAppState } from '../../state'
import { useDeposits } from '../../hooks/useDeposits'
import { PageParams } from '../TransactionHistory/TransactionsTable/TransactionsTable'
import { useWithdrawals } from '../../hooks/useWithdrawals'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { TransactionStatusInfo } from '../TransactionHistory/TransactionStatusInfo'
import { ArbitrumStats, statsLocalStorageKey } from './ArbitrumStats'
import { SettingsDialog } from '../common/SettingsDialog'
import { isNetwork } from '../../util/networks'

export const motionDivProps = {
  layout: true,
  initial: {
    opacity: 0,
    scale: 0.9
  },
  animate: {
    opacity: 1,
    scale: 1
  },
  exit: {
    opacity: 0,
    scale: 0.9
  }
}

export function MainContent() {
  const { closeTransactionHistoryPanel } = useAppContextActions()
  const {
    layout: { isTransactionHistoryPanelVisible }
  } = useAppContextState()

  const [isArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey)

  const {
    app: { arbTokenBridge }
  } = useAppState()

  const { l2 } = useNetworksAndSigners()

  const [depositsPageParams, setDepositsPageParams] = useState<PageParams>({
    searchString: '',
    pageNumber: 0,
    pageSize: 10
  })

  const [withdrawalsPageParams, setWithdrawalsPageParams] =
    useState<PageParams>({
      searchString: '',
      pageNumber: 0,
      pageSize: 10
    })

  const pageSize = useMemo(
    () => (isNetwork(l2.network.id).isOrbitChain ? 5 : 10),
    [l2.network.id]
  )

  const {
    data: depositsData = {
      deposits: [],
      pendingDeposits: [],
      transformedDeposits: []
    },
    isValidating: depositsLoading,
    error: depositsError
  } = useDeposits({ ...depositsPageParams, pageSize })

  const {
    data: withdrawalsData = {
      withdrawals: [],
      pendingWithdrawals: [],
      transformedWithdrawals: []
    },
    isValidating: withdrawalsLoading,
    error: withdrawalsError
  } = useWithdrawals({ ...withdrawalsPageParams, pageSize })

  useEffect(() => {
    // if pending deposits found, add them in the store - this will add them to pending div + start polling for their status
    arbTokenBridge?.transactions?.setDepositsInStore?.(
      depositsData.pendingDeposits
    )
  }, [JSON.stringify(depositsData.pendingDeposits)]) // only run side effect on value change, not reference (Call stack exceeded)

  useEffect(() => {
    // if pending withdrawals found, add them in the store - this will add them to pending div + start polling for their status
    arbTokenBridge?.setWithdrawalsInStore?.(withdrawalsData.pendingWithdrawals)
  }, [JSON.stringify(withdrawalsData.pendingWithdrawals)]) // only run side effect on value change, not reference (Call stack exceeded)

  return (
    <div className="flex w-full justify-center">
      <div className="main-panel flex w-full max-w-[600px] flex-col gap-2">
        <div className="hidden text-center text-5xl">Arbitrum Token Bridge</div>

        {/* if the user has some pending claim txns or retryables to redeem, show that banner here */}
        <TransactionStatusInfo deposits={depositsData.transformedDeposits} />

        <TransferPanel />
      </div>
      <SidePanel
        isOpen={isTransactionHistoryPanelVisible}
        heading="Transaction History"
        onClose={closeTransactionHistoryPanel}
      >
        {/* Transaction history - pending transactions + history table */}
        <TransactionHistory
          {...{
            depositsPageParams: { ...depositsPageParams, pageSize },
            withdrawalsPageParams: { ...withdrawalsPageParams, pageSize },
            depositsData,
            depositsLoading,
            depositsError,
            withdrawalsData,
            withdrawalsLoading,
            withdrawalsError,
            setDepositsPageParams,
            setWithdrawalsPageParams
          }}
        />
      </SidePanel>

      {/* Settings panel */}
      <SettingsDialog />

      {/* Toggle-able Stats for nerds */}
      {isArbitrumStatsVisible && <ArbitrumStats />}
    </div>
  )
}
