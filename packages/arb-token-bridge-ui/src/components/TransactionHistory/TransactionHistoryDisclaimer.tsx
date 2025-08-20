import { useAccount } from 'wagmi'
import { useAccountType } from '../../hooks/useAccountType'
import { useMemo } from 'react'
import { ChainId } from '../../types/ChainId'
import { useBalance } from '../../hooks/useBalance'
import { CommonAddress } from '../../util/CommonAddressUtils'
import { useLifiTransactionHistory } from '../../hooks/useLifiTransactionHistory'
import { ExternalLink } from '../common/ExternalLink'

export const highlightTransactionHistoryDisclaimer = () => {
  const element = document.getElementById('tx-history-disclaimer')
  if (!element) return

  element.classList.add('animate-blink', 'bg-highlight')

  // Remove highlight effect after 3 seconds
  setTimeout(() => {
    element.classList.remove('animate-blink', 'bg-highlight')
  }, 3000)
}

export function TransactionHistoryDisclaimer() {
  const { address: walletAddress } = useAccount()
  const { accountType } = useAccountType()
  const { data: lifiTransactions } = useLifiTransactionHistory({
    walletAddress
  })

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

  const showOftDisclaimer = useMemo(() => {
    const mainnetUsdtBalance = mainnetBalances?.[CommonAddress.Ethereum.USDT]
    const arbOneUsdtBalance = arbOneBalances?.[CommonAddress.ArbitrumOne.USDT]

    const userHasUsdtBalance =
      (mainnetUsdtBalance && mainnetUsdtBalance.gt(0)) ||
      (arbOneUsdtBalance && arbOneUsdtBalance.gt(0))

    return userHasUsdtBalance && accountType === 'smart-contract-wallet'
  }, [mainnetBalances, arbOneBalances, accountType])

  const showLifiDisclaimer =
    accountType === 'smart-contract-wallet' ||
    (lifiTransactions && lifiTransactions.length > 0)

  if (!showOftDisclaimer && !showLifiDisclaimer) {
    return null
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-md bg-blue/20 p-2 text-sm text-white"
      id="tx-history-disclaimer"
    >
      <span className="font-bold">Don&apos;t see your transaction?</span>
      <ul className="list-disc pl-4">
        {showLifiDisclaimer &&
          (lifiTransactions && lifiTransactions.length > 0 ? (
            <li>
              LiFi transactions can be found on{' '}
              <ExternalLink
                href={
                  walletAddress
                    ? `https://scan.li.fi/wallet/${walletAddress}`
                    : 'https://scan.li.fi'
                }
                className="arb-hover inline-flex underline"
              >
                LifiScanner
              </ExternalLink>
              .
            </li>
          ) : (
            <li>
              LiFi transactions inititated by Smart-contract wallets can be
              found on{' '}
              <ExternalLink
                href={
                  walletAddress
                    ? `https://arbiscan.io/address/${walletAddress}`
                    : 'https://arbiscan.io'
                }
                className="arb-hover inline-flex underline"
              >
                Arbiscan
              </ExternalLink>
              .
            </li>
          ))}
        {showOftDisclaimer && (
          <li>
            LayerZero USDT transfers initiated by Smart-contract wallets can be
            found on{' '}
            <ExternalLink
              href={
                walletAddress
                  ? `https://etherscan.io/address/${walletAddress}`
                  : 'https://etherscan.io'
              }
            >
              Etherscan
            </ExternalLink>{' '}
            and{' '}
            <ExternalLink
              href={
                walletAddress
                  ? `https://arbiscan.io/address/${walletAddress}`
                  : 'https://arbiscan.io'
              }
            >
              Arbiscan
            </ExternalLink>
            .
          </li>
        )}
      </ul>
      <span className="pl-4">
        Full integration of transactions history is coming soon.
      </span>
    </div>
  )
}
