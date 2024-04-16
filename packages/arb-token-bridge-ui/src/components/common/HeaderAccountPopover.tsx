import { Popover } from '@headlessui/react'
import {
  ArrowLeftOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import { useCopyToClipboard, useMedia } from 'react-use'
import { twMerge } from 'tailwind-merge'

import { useAccountType } from '../../hooks/useAccountType'
import { useNetworks } from '../../hooks/useNetworks'
import { getExplorerUrl, isNetwork } from '../../util/networks'
import { useAccountMenu } from '../../hooks/useAccountMenu'
import { ExternalLink } from './ExternalLink'
import { SafeImage } from './SafeImage'
import { Transition } from './Transition'
import { CustomBoringAvatar } from './CustomBoringAvatar'

export function HeaderAccountPopover({
  isCorrectNetworkConnected = true
}: {
  isCorrectNetworkConnected?: boolean // is the app connected to a correct network? if no, then show limited options in the menu
}) {
  const {
    address,
    accountShort,
    ensName,
    ensAvatar,
    openTransactionHistory,
    disconnect,
    udInfo,
    chain,
    setQueryParams
  } = useAccountMenu()
  const [{ sourceChain }] = useNetworks()
  const { isTestnet } = isNetwork(sourceChain.id)
  const [, copyToClipboard] = useCopyToClipboard()
  const isSmallScreen = useMedia('(max-width: 639px)')
  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()

  const [showCopied, setShowCopied] = useState(false)

  function copy(value: string) {
    setShowCopied(true)
    copyToClipboard(value)
    setTimeout(() => setShowCopied(false), 1000)
  }

  const headerItemsClassName =
    'arb-hover flex w-full flex-row items-center space-x-2 px-12 py-2 text-sm sm:text-sm text-gray-4 sm:text-white hover:bg-ocl-blue sm:px-4 sm:py-1'

  return (
    <Popover className="relative w-full px-4 sm:w-max sm:p-0">
      <Popover.Button
        className={twMerge(
          'flex w-full flex-row items-center justify-start gap-3 px-[12px] py-[7px] transition-[background] duration-300',
          'ui-open:bg-white/20 ui-not-open:bg-transparent ui-not-open:hover:bg-white/20',
          'sm:w-max sm:rounded sm:border sm:px-2 sm:py-1',
          isTestnet
            ? 'sm:border-white sm:ui-not-open:bg-white/20'
            : 'sm:border-gray-1 sm:ui-not-open:bg-gray-1 sm:ui-not-open:hover:bg-white/10'
        )}
        role="button"
        aria-label="Account Header Button"
      >
        <SafeImage
          src={ensAvatar || undefined}
          className="h-6 w-6 rounded-full sm:h-8 sm:w-8"
          fallback={
            <CustomBoringAvatar size={isSmallScreen ? 24 : 40} name={address} />
          }
        />
        <span className="flex flex-col text-justify text-base leading-extra-tight text-gray-4 sm:text-white">
          {ensName ?? udInfo.name ?? accountShort}
          {isSmartContractWallet && !isLoadingAccountType && (
            <span className="text-[10px]">Smart Contract Wallet</span>
          )}
        </span>

        <ChevronDownIcon className="ml-auto h-[16px] w-[16px] text-gray-4 transition duration-200 sm:text-white" />
      </Popover.Button>
      <Transition className="w-full sm:absolute sm:top-0">
        <Popover.Panel className="flex w-full flex-col overflow-hidden rounded pb-2 sm:absolute sm:top-0 sm:bg-dark">
          {/* Profile photo with address */}
          {showCopied && (
            <span className="absolute right-2 top-4 z-50 text-xs text-white">
              Copied to clipboard!
            </span>
          )}
          <div className="relative hidden w-full flex-row items-center px-2 pb-2 pt-3 sm:flex">
            {/* Blurred background */}
            <div className="absolute inset-0 flex h-8 w-full flex-col items-center overflow-hidden bg-dark text-center">
              <div className="scale-400 blur-2xl filter">
                <SafeImage
                  className="h-100 w-100 rounded-full"
                  src={ensAvatar || undefined}
                  fallback={<CustomBoringAvatar size={200} name={address} />}
                />
              </div>
            </div>

            {/* Actual image and account name */}
            <div className="relative flex flex-row items-center gap-2">
              <div className="avatar-container box-content rounded-full border-[3px] border-dark">
                <SafeImage
                  src={ensAvatar || undefined}
                  className="h-[54px] w-[54px] rounded-full"
                  fallback={<CustomBoringAvatar size={54} name={address} />}
                />
              </div>
              <button
                className="flex translate-y-1 flex-row items-center gap-1 text-white/70 hover:text-white"
                onClick={() => copy(ensName ?? udInfo.name ?? address ?? '')}
              >
                <span className="max-w-[10rem] overflow-hidden text-ellipsis text-sm">
                  {ensName ?? udInfo.name ?? accountShort}
                </span>
                <DocumentDuplicateIcon className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="flex w-full flex-col justify-between sm:flex-col sm:items-end sm:px-0">
            {/* Transactions button */}
            {isCorrectNetworkConnected && (
              <button
                className={headerItemsClassName}
                onClick={openTransactionHistory}
              >
                <DocumentTextIcon className="h-3 w-3 text-white/60 sm:text-white" />
                <span>Transactions</span>
              </button>
            )}

            {/* Explorer button */}
            {isCorrectNetworkConnected && chain && (
              <ExternalLink
                href={`${getExplorerUrl(chain.id)}/address/${address}`}
                className={headerItemsClassName}
              >
                <ArrowTopRightOnSquareIcon className="h-3 w-3 text-white/60 sm:text-white" />
                <span>Explorer</span>
              </ExternalLink>
            )}

            {/* Settings */}
            {isCorrectNetworkConnected && (
              <button
                className={headerItemsClassName}
                onClick={() => setQueryParams({ settingsOpen: true })}
              >
                <Cog6ToothIcon className="h-3 w-3 text-white/60 sm:text-white" />
                <span>Settings</span>
              </button>
            )}

            {/* Disconnect button */}
            <button
              className={headerItemsClassName}
              onClick={() => disconnect()}
            >
              <ArrowLeftOnRectangleIcon className="h-3 w-3 text-white/60 sm:text-white" />
              <span>Disconnect</span>
            </button>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  )
}
