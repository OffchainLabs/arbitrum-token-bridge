import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { ExternalLink } from '../common/ExternalLink'
import { ChainId } from '../../types/ChainId'
import { useBalance } from '../../hooks/useBalance'
import { CommonAddress } from '../../util/CommonAddressUtils'

export const highlightOftTransactionHistoryDisclaimer = () => {
  const element = document.getElementById('usdt0-tx-history-disclaimer')
  if (!element) return

  element.classList.add('animate-blink', 'bg-highlight')

  // Remove highlight effect after 3 seconds
  setTimeout(() => {
    element.classList.remove('animate-blink', 'bg-highlight')
  }, 3000)
}

//only show this disclaimer if the user has positive balances of `CommonAddress.Ethereum.USDT` or `CommonAddress.Arbitrum.USDT`
export function OftTransactionHistoryDisclaimer() {
  const { address: walletAddress } = useAccount()

  const {
    erc20: [mainnetBalances]
  } = useBalance({
    chainId: ChainId.Ethereum,
    walletAddress
  })
  const {
    erc20: [arbOneBalances]
  } = useBalance({
    chainId: ChainId.ArbitrumOne,
    walletAddress
  })

  const showDisclaimer = useMemo(() => {
    const mainnetUsdtBalance = mainnetBalances?.[CommonAddress.Ethereum.USDT]
    const arbOneUsdtBalance = arbOneBalances?.[CommonAddress.ArbitrumOne.USDT]

    const userHasUsdtBalance =
      (mainnetUsdtBalance && mainnetUsdtBalance.gt(0)) ||
      (arbOneUsdtBalance && arbOneUsdtBalance.gt(0))

    if (userHasUsdtBalance) {
      return true
    }
    return false
  }, [mainnetBalances, arbOneBalances])

  if (!showDisclaimer) {
    return null
  }

  return (
    <div
      className="mb-4 flex w-full flex-col gap-2 rounded bg-orange-dark/30 p-2 text-sm font-light text-white transition-all duration-300"
      id="usdt0-tx-history-disclaimer"
    >
      <p className="flex flex-row items-center gap-1 font-bold">
        <InformationCircleIcon className="h-3 w-3" />
        Notice: USDT/USDT0 Transactions
      </p>
      <p className="text-xs">
        Transaction History for USDT/USDT0 Transfers (between Mainnet and
        Arbitrum One) made with LayerZero OFT protocol can be found on{' '}
        <ExternalLink
          href={`https://layerzeroscan.com/address/${walletAddress}`}
          className="underline hover:opacity-70"
        >
          LayerZero Scanner
        </ExternalLink>{' '}
        . We are working on integrating those directly into this transaction
        history page.
      </p>
    </div>
  )
}
