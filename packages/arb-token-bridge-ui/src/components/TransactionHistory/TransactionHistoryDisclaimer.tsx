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
  const { isSmartContractWallet } = useAccountType()
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

    return userHasUsdtBalance && isSmartContractWallet
  }, [mainnetBalances, arbOneBalances, isSmartContractWallet])

  const showLifiDisclaimer = lifiTransactions && lifiTransactions.length > 0

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
        {showLifiDisclaimer && (
          <li>
            Some LiFi routes might be on{' '}
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
        )}
        {showOftDisclaimer && (
          <li>
            Some LayerZero USDT transfers might be on{' '}
            <ExternalLink
              href={
                walletAddress
                  ? // Only show Arb/Mainnet and Mainnet/Arb transfers
                    `https://layerzeroscan.com/address/${walletAddress}?srcChainKey[0]=arbitrum&srcChainKey[1]=ethereum&dstChainKey[0]=arbitrum&dstChainKey[1]=ethereum`
                  : 'https://layerzeroscan.com'
              }
              className="arb-hover inline-flex underline"
            >
              <ExternalLink></ExternalLink>
              LayerZero scanner
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
