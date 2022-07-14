import { useMemo, useState } from 'react'

import { useAppState } from '../../state'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { TransactionsModal } from '../TransactionsModal/TransactionsModal'
import { TransactionsTable } from '../TransactionsTable/TransactionsTable'
import { TransferPanel } from '../TransferPanel/TransferPanel'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import useTwitter from '../../hooks/useTwitter'

const MainContent = () => {
  const {
    app: { mergedTransactions }
  } = useAppState()
  const { l2 } = useNetworksAndSigners()
  const handleTwitterClick = useTwitter()

  const [transactionsModalOpen, setTransactionModalOpen] = useState(false)

  const isArbitrumOne = useMemo(() => {
    if (typeof l2.network === 'undefined') {
      return false
    }

    return l2.network.chainID === 42161
  }, [l2])

  const isNitroDevnet = useMemo(() => {
    if (typeof l2.network === 'undefined') {
      return false
    }

    return l2.network.chainID === 421613
  }, [l2])

  return (
    <div className="mx-auto px-4">
      {isArbitrumOne && (
        <div className="mb-4 mx-auto max-w-networkBox w-full">
          <Alert type="blue">
            NOTICE: Arbitrum One is in mainnet Beta, which currently includes
            administrative controls.{' '}
            <a
              target="_blank"
              rel="noreferrer"
              href="https://developer.offchainlabs.com/docs/mainnet#some-words-of-caution"
            >
              <u>(more info)</u>
            </a>
          </Alert>
        </div>
      )}

      {isNitroDevnet && (
        <div className="mb-4 mx-auto max-w-networkBox w-full">
          <Alert type="blue">
            <span id="twitter-faucet-container">
              Request testnet Eth from the{' '}
              <a id="faucet-link" target="_blank" onClick={handleTwitterClick}>
                Nitro Testnet twitter faucet!
              </a>
            </span>
          </Alert>
        </div>
      )}

      <div className="mb-4 mx-auto max-w-networkBox w-full">
        <Alert type="ramps">
          Looking for fast bridges and direct fiat on-ramps for Arbitrum?&nbsp;
          <a
            target="_blank"
            rel="noreferrer"
            href="https://portal.arbitrum.one/#bridgesandonramps"
          >
            <u>Click here!</u>
          </a>
        </Alert>
      </div>

      <TransferPanel />

      {mergedTransactions?.length > 0 && (
        <>
          <TransactionsTable transactions={mergedTransactions?.slice(0, 5)} />

          <div className="h-6" />

          {mergedTransactions?.length > 5 && (
            <div className="max-w-networkBox mx-auto mb-4">
              <Button
                onClick={() => setTransactionModalOpen(true)}
                variant="white"
                size="md"
                className="w-full"
              >
                View all
              </Button>
            </div>
          )}
        </>
      )}

      <TransactionsModal
        isOpen={transactionsModalOpen}
        setIsOpen={setTransactionModalOpen}
      />
    </div>
  )
}

export default MainContent
