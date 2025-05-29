import { ArrowRightIcon } from '@heroicons/react/24/solid'
import dayjs from 'dayjs'
import Image from 'next/image'
import { PropsWithChildren } from 'react'

import LifiLogo from '@/icons/lifi.svg'
import ArbitrumLogo from '@/images/ArbitrumLogo.svg'
import CctpLogoColor from '@/images/CctpLogoColor.svg'
import EthereumLogoRoundLight from '@/images/EthereumLogoRoundLight.svg'
import LayerZeroIcon from '@/images/LayerZeroIcon.png'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'

import { ether, GET_HELP_LINK } from '../../constants'
import { useETHPrice } from '../../hooks/useETHPrice'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { MergedTransaction } from '../../state/app/state'
import { isCustomDestinationAddressTx } from '../../state/app/utils'
import { addressesEqual } from '../../util/AddressUtils'
import { trackEvent } from '../../util/AnalyticsUtils'
import { shortenAddress } from '../../util/CommonUtils'
import { getExplorerUrl, getNetworkName, isNetwork } from '../../util/networks'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { isBatchTransfer } from '../../util/TokenDepositUtils'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { Button } from '../common/Button'
import { ExternalLink } from '../common/ExternalLink'
import { NetworkImage } from '../common/NetworkImage'
import { SafeImage } from '../common/SafeImage'
import { getTransactionType, isLifiTransfer, isTxCompleted } from './helpers'
import { BatchTransferNativeTokenTooltip } from './TransactionHistoryTable'
import { TransactionsTableDetailsSteps } from './TransactionsTableDetailsSteps'
import { TransactionsTableTokenImage } from './TransactionsTableTokenImage'

const ProtocolNameAndLogo = ({ tx }: { tx: MergedTransaction }) => {
  if (isLifiTransfer(tx)) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex flex-row items-center gap-1">
          <SafeImage
            alt="Bridge logo"
            src={tx.toolDetails.logoURI}
            width={30}
            height={30}
          />
          <span>{tx.toolDetails.name}</span>
        </div>
        <div className="flex flex-row items-center gap-1">
          <Image alt="Lifi logo" src={LifiLogo} width={16} height={16} />
          <span>Bridged via LiFi</span>
        </div>
      </div>
    )
  }

  let protocolLogo, protocolName, protocolDescription

  if (tx.isOft) {
    protocolLogo = LayerZeroIcon
    protocolName = 'LayerZero OFT'
    protocolDescription = '(Omnichain Fungible Token)'
  } else if (tx.isCctp) {
    protocolLogo = CctpLogoColor
    protocolName = 'CCTP'
    protocolDescription = '(Cross-Chain Transfer Protocol)'
  } else {
    protocolLogo = ArbitrumLogo
    protocolName = "Arbitrum's native bridge"
    protocolDescription = ''
  }

  return (
    <div className="flex items-center space-x-2">
      <Image
        alt="Bridge logo"
        className="h-4 w-4 shrink-0"
        src={protocolLogo}
        width={16}
        height={16}
      />

      <span>
        {protocolName}{' '}
        {protocolDescription && (
          <span className="text-white/70">{protocolDescription}</span>
        )}
      </span>
    </div>
  )
}

const DetailsBox = ({
  children,
  header
}: PropsWithChildren<{ header?: string }>) => {
  return (
    <div className="flex w-full flex-col rounded border border-white/30 bg-black p-3 font-light text-white">
      {header && (
        <h4 className="mb-2 text-xs uppercase text-white/60">{header}</h4>
      )}
      {children}
    </div>
  )
}

interface TransactionDetailsContentProps {
  tx: MergedTransaction
  walletAddress?: string
}

export const TransactionDetailsContent = ({
  tx,
  walletAddress
}: TransactionDetailsContentProps) => {
  const { ethToUSD } = useETHPrice()
  const childProvider = getProviderForChainId(tx?.childChainId ?? 0)
  const nativeCurrency = useNativeCurrency({ provider: childProvider })

  if (!tx || !nativeCurrency) {
    return null
  }

  const tokenSymbol = sanitizeTokenSymbol(tx.asset, {
    erc20L1Address: tx.tokenAddress,
    chainId: tx.sourceChainId
  })

  const showPriceInUsd =
    !isNetwork(tx.parentChainId).isTestnet && tx.asset === ether.symbol

  const isDifferentSourceAddress = walletAddress
    ? !addressesEqual(walletAddress, tx.sender)
    : false
  const isDifferentDestinationAddress = isCustomDestinationAddressTx({
    sender: walletAddress,
    destination: tx.destination
  })

  const { sourceChainId, destinationChainId } = tx

  const sourceNetworkName = getNetworkName(sourceChainId)
  const destinationNetworkName = getNetworkName(destinationChainId)

  return (
    <div className="grid gap-4">
      <DetailsBox>
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between text-xs text-white">
            <span>{dayjs(tx.createdAt).format('MMMM DD, YYYY')}</span>
            <span>{dayjs(tx.createdAt).format('h:mma')}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <TransactionsTableTokenImage tx={tx} />
              <span>
                {formatAmount(Number(tx.value), {
                  symbol: tokenSymbol
                })}
              </span>
              {showPriceInUsd && (
                <span className="text-white/70">
                  {formatUSD(ethToUSD(Number(tx.value)))}
                </span>
              )}
            </div>
            {isBatchTransfer(tx) && (
              <BatchTransferNativeTokenTooltip tx={tx}>
                <div className="flex items-center space-x-2">
                  <Image
                    height={20}
                    width={20}
                    alt={`${nativeCurrency.symbol} logo`}
                    src={nativeCurrency.logoUrl ?? EthereumLogoRoundLight}
                  />
                  <span className="ml-2">
                    {formatAmount(Number(tx.value2), {
                      symbol: nativeCurrency.symbol
                    })}
                  </span>
                  {isNetwork(tx.sourceChainId).isEthereumMainnet && (
                    <span className="text-white/70">
                      {formatUSD(ethToUSD(Number(tx.value2)))}
                    </span>
                  )}
                </div>
              </BatchTransferNativeTokenTooltip>
            )}
          </div>
        </div>
      </DetailsBox>

      <DetailsBox header="Network">
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <NetworkImage chainId={sourceChainId} className="h-5 w-5" />
            <span>{sourceNetworkName}</span>
          </div>
          <ArrowRightIcon width={16} />
          <div className="flex space-x-2">
            <NetworkImage chainId={destinationChainId} className="h-5 w-5" />
            <span>{destinationNetworkName}</span>
          </div>
        </div>
      </DetailsBox>

      <DetailsBox header="Bridge">
        <ProtocolNameAndLogo tx={tx} />
      </DetailsBox>

      {(isDifferentSourceAddress || isDifferentDestinationAddress) && (
        <DetailsBox header="Custom Address">
          {isDifferentSourceAddress && (
            <span className="text-xs">
              Funds received from{' '}
              <ExternalLink
                className="arb-hover underline"
                href={`${getExplorerUrl(sourceChainId)}/address/${tx.sender}`}
                aria-label={`Custom address: ${shortenAddress(
                  String(tx.sender)
                )}`}
              >
                {shortenAddress(String(tx.sender))}
              </ExternalLink>
            </span>
          )}
          {isDifferentDestinationAddress && (
            <span className="text-xs">
              Funds sent to{' '}
              <ExternalLink
                className="arb-hover underline"
                href={`${getExplorerUrl(destinationChainId)}/address/${
                  tx.destination
                }`}
                aria-label={`Custom address: ${shortenAddress(
                  String(tx.destination)
                )}`}
              >
                {shortenAddress(String(tx.destination))}
              </ExternalLink>
            </span>
          )}
        </DetailsBox>
      )}

      <DetailsBox>
        <TransactionsTableDetailsSteps tx={tx} />
      </DetailsBox>

      {!isTxCompleted(tx) && (
        <div className="flex justify-end">
          <ExternalLink href={GET_HELP_LINK}>
            <Button
              variant="secondary"
              className="border-white/30 text-xs"
              onClick={() => {
                trackEvent('Tx Error: Get Help Click', {
                  network: getNetworkName(tx.sourceChainId),
                  transactionType: getTransactionType(tx)
                })
              }}
            >
              Get help
            </Button>
          </ExternalLink>
        </div>
      )}
    </div>
  )
}
