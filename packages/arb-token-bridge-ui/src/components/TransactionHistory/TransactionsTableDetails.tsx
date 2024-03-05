import { XMarkIcon } from '@heroicons/react/24/outline'
import { ArrowRightIcon } from '@heroicons/react/24/solid'
import { Fragment, PropsWithChildren, useMemo } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import Image from 'next/image'
import dayjs from 'dayjs'
import CctpLogoColor from '@/images/CctpLogoColor.svg'
import ArbitrumLogo from '@/images/ArbitrumLogo.svg'

import { useTxDetailsStore } from './TransactionHistory'
import { getExplorerUrl, getNetworkName, isNetwork } from '../../util/networks'
import { NetworkImage } from '../common/NetworkImage'
import { TransactionsTableTokenImage } from './TransactionsTableTokenImage'
import { formatAmount, formatUSD } from '../../util/NumberUtils'
import { useETHPrice } from '../../hooks/useETHPrice'
import { ExternalLink } from '../common/ExternalLink'
import { TransactionsTableDetailsSteps } from './TransactionsTableDetailsSteps'
import { Button } from '../common/Button'
import { GET_HELP_LINK, ether } from '../../constants'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { shortenAddress } from '../../util/CommonUtils'
import { isTxCompleted } from './helpers'
import { Address } from '../../util/AddressUtils'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'

const DetailsBox = ({
  children,
  header
}: PropsWithChildren<{ header?: string }>) => {
  return (
    <div className="my-2 flex w-full flex-col rounded border border-white/30 bg-black p-3 font-light text-white">
      {header && (
        <h4 className="mb-2 text-xs uppercase text-white/60">{header}</h4>
      )}
      {children}
    </div>
  )
}

export const TransactionsTableDetails = ({
  address
}: {
  address: Address | undefined
}) => {
  const { tx: txFromStore, isOpen, close, reset } = useTxDetailsStore()
  const { ethToUSD } = useETHPrice()
  const { transactions } = useTransactionHistory(address)

  const tx = useMemo(() => {
    if (!txFromStore) {
      return null
    }

    // we need to get tx from the hook to make sure we have up to date details, e.g. status
    return transactions.find(
      t =>
        t.parentChainId === txFromStore.parentChainId &&
        t.childChainId === txFromStore.childChainId &&
        t.txId === txFromStore.txId
    )
  }, [transactions, txFromStore])

  if (!tx || !address) {
    return null
  }

  const tokenSymbol = sanitizeTokenSymbol(tx.asset, {
    erc20L1Address: tx.tokenAddress,
    chainId: tx.sourceChainId
  })

  const showPriceInUsd =
    !isNetwork(tx.parentChainId).isTestnet && tx.asset === ether.symbol

  const isDifferentSourceAddress =
    address.toLowerCase() !== tx.sender?.toLowerCase()
  const isDifferentDestinationAddress =
    address.toLowerCase() !== tx.destination?.toLowerCase()

  const { sourceChainId, destinationChainId } = tx

  const sourceNetworkName = getNetworkName(sourceChainId)
  const destinationNetworkName = getNetworkName(destinationChainId)

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        open={typeof tx !== 'undefined'}
        className="relative z-40"
        onClose={close}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-70"
          leave="ease-in duration-200"
          leaveFrom="opacity-70"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center text-center sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
              afterLeave={reset}
            >
              <Dialog.Panel className="h-screen w-screen transform overflow-hidden rounded border border-white/10 bg-dark p-4 text-left align-middle shadow shadow-white/10 transition-all sm:h-auto sm:w-full sm:max-w-[488px]">
                <Dialog.Title
                  className="mb-4 flex items-center justify-between text-lg font-light text-white"
                  as="h3"
                >
                  Transaction details
                  <button onClick={close} className="arb-hover">
                    <XMarkIcon height={20} />
                  </button>
                </Dialog.Title>

                <DetailsBox>
                  <div className="flex flex-col space-y-3">
                    <div className="flex justify-between text-xs text-white">
                      <span>{dayjs(tx.createdAt).format('MMMM DD, YYYY')}</span>
                      <span>{dayjs(tx.createdAt).format('h:mma')}</span>
                    </div>
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
                  </div>
                </DetailsBox>

                <DetailsBox header="Network">
                  <div className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <NetworkImage
                        chainId={sourceChainId}
                        className="h-5 w-5"
                      />
                      <span>{sourceNetworkName}</span>
                    </div>
                    <ArrowRightIcon width={16} />
                    <div className="flex space-x-2">
                      <NetworkImage
                        chainId={destinationChainId}
                        className="h-5 w-5"
                      />
                      <span>{destinationNetworkName}</span>
                    </div>
                  </div>
                </DetailsBox>

                <DetailsBox header="Bridge">
                  <div className="flex space-x-2">
                    <Image
                      alt="Bridge logo"
                      src={tx.isCctp ? CctpLogoColor : ArbitrumLogo}
                      width={16}
                      height={16}
                    />

                    {tx.isCctp ? (
                      <span>
                        CCTP{' '}
                        <span className="text-white/70">
                          (Cross-Chain Transfer Protocol)
                        </span>
                      </span>
                    ) : (
                      <span>Arbitrum&apos;s native bridge</span>
                    )}
                  </div>
                </DetailsBox>

                {(isDifferentSourceAddress ||
                  isDifferentDestinationAddress) && (
                  <DetailsBox header="Custom Address">
                    {isDifferentSourceAddress && (
                      <span className="text-xs">
                        Funds received from{' '}
                        <ExternalLink
                          className="arb-hover underline"
                          href={`${getExplorerUrl(sourceChainId)}/address/${
                            tx.sender
                          }`}
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
                          href={`${getExplorerUrl(
                            destinationChainId
                          )}/address/${tx.destination}`}
                        >
                          {shortenAddress(String(tx.destination))}
                        </ExternalLink>
                      </span>
                    )}
                  </DetailsBox>
                )}

                <DetailsBox>
                  <TransactionsTableDetailsSteps tx={tx} address={address} />
                </DetailsBox>

                {!isTxCompleted(tx) && (
                  <div className="flex justify-end">
                    <ExternalLink href={GET_HELP_LINK}>
                      <Button
                        variant="secondary"
                        className="border-white/30 text-xs"
                      >
                        Get help
                      </Button>
                    </ExternalLink>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
