import { useEffect, useMemo, useState } from 'react'
import { useCopyToClipboard, useMedia } from 'react-use'
import { Popover } from '@headlessui/react'
import {
  ChevronDownIcon,
  ArrowTopRightOnSquareIcon,
  ArrowLeftOnRectangleIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Resolution } from '@unstoppabledomains/resolution'
import BoringAvatar from 'boring-avatars'
import { twMerge } from 'tailwind-merge'
import {
  useAccount,
  useDisconnect,
  useEnsAvatar,
  useEnsName,
  useNetwork,
  useProvider
} from 'wagmi'

import { Transition } from './Transition'
import { ExternalLink } from './ExternalLink'
import { SafeImage } from './SafeImage'
import { getExplorerUrl, isNetwork } from '../../util/networks'
import { useAppContextActions } from '../App/AppContext'
import { trackEvent } from '../../util/AnalyticsUtils'
import { shortenAddress } from '../../util/CommonUtils'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useNetworks } from '../../hooks/useNetworks'

type UDInfo = { name: string | null }
const udInfoDefaults: UDInfo = { name: null }

function CustomBoringAvatar({ size, name }: { size: number; name?: string }) {
  return (
    <BoringAvatar
      size={size}
      name={name?.toLowerCase()}
      variant="beam"
      colors={['#11365E', '#EDD75A', '#73B06F', '#0C8F8F', '#405059']}
    />
  )
}

async function tryLookupUDName(provider: JsonRpcProvider, address: string) {
  const UDresolution = Resolution.fromEthersProvider({
    uns: {
      // TODO => remove Layer2 config when UD lib supports our use case
      // Layer2 (polygon) is required in the object type but we only want to use Layer1
      // This is a hack to only support Ethereum Mainnet UD names
      // https://github.com/unstoppabledomains/resolution/issues/229
      locations: {
        Layer1: {
          network: 'mainnet',
          provider
        },
        Layer2: {
          network: 'mainnet',
          provider
        }
      }
    }
  })
  try {
    return await UDresolution.reverse(address)
  } catch (error) {
    return null
  }
}

export function HeaderAccountPopover({
  isCorrectNetworkConnected = true
}: {
  isCorrectNetworkConnected?: boolean // is the app connected to a correct network? if no, then show limited options in the menu
}) {
  const l1Provider = useProvider({ chainId: 1 })
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const { chain } = useNetwork()
  const [{ sourceChain }] = useNetworks()
  const { isTestnet } = isNetwork(sourceChain.id)
  const [, copyToClipboard] = useCopyToClipboard()
  const isSmallScreen = useMedia('(max-width: 419px)')

  const { openTransactionHistoryPanel } = useAppContextActions()
  const [, setQueryParams] = useArbQueryParams()

  const [showCopied, setShowCopied] = useState(false)
  const [udInfo, setUDInfo] = useState<UDInfo>(udInfoDefaults)
  const { data: ensName } = useEnsName({
    address,
    chainId: 1
  })

  const { data: ensAvatar } = useEnsAvatar({
    address,
    chainId: 1
  })

  useEffect(() => {
    if (!address) return
    async function resolveUdName() {
      const udName = await tryLookupUDName(
        l1Provider as JsonRpcProvider,
        address as string
      )

      setUDInfo({ name: udName })
    }
    resolveUdName()
  }, [address, l1Provider])

  const accountShort = useMemo(() => {
    if (typeof address === 'undefined') {
      return ''
    }

    return shortenAddress(address)
  }, [address])

  function copy(value: string) {
    setShowCopied(true)
    copyToClipboard(value)
    setTimeout(() => setShowCopied(false), 1000)
  }

  function openTransactionHistory() {
    openTransactionHistoryPanel()
    trackEvent('Open Transaction History Click', { pageElement: 'Header' })
  }

  const headerItemsClassName =
    'arb-hover flex w-full flex-row items-center space-x-2 px-12 py-2 text-sm sm:text-sm  text-white/60 sm:text-white hover:bg-ocl-blue sm:px-4 sm:py-1'

  return (
    <Popover className="relative w-full px-4 sm:w-max sm:p-0">
      <Popover.Button
        className={twMerge(
          'flex w-full flex-row items-center justify-start gap-3 px-[12px] py-[7px]',
          'ui-open:bg-white/20 ui-not-open:bg-transparent ui-not-open:hover:bg-white/20',
          'sm:w-max sm:rounded sm:border sm:px-2 sm:py-1',
          isTestnet
            ? 'sm:border-white sm:ui-not-open:bg-white/20'
            : 'sm:border-gray-1 sm:bg-gray-1'
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
        <span className="text-base text-white/60 sm:text-white">
          {ensName ?? udInfo.name ?? accountShort}
        </span>

        <ChevronDownIcon className="ml-auto h-[16px] w-[16px] text-white/60 transition duration-200 sm:text-white" />
      </Popover.Button>
      <Transition className="z-40 w-full sm:absolute sm:top-0">
        <Popover.Panel className="flex w-full flex-col overflow-hidden rounded pb-2 sm:absolute sm:top-0 sm:bg-dark">
          {/* Profile photo with address */}
          {showCopied && (
            <span className="absolute right-2 top-4 z-50 text-xs text-white">
              Copied to clipboard!
            </span>
          )}
          <button
            className="relative hidden w-full flex-row items-center px-2 pb-2 pt-3 text-white/70 hover:text-white sm:flex"
            onClick={() => copy(ensName ?? udInfo.name ?? address ?? '')}
          >
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
            <div className="relative z-10 flex flex-row items-center gap-2">
              <div className="avatar-container box-content rounded-full border-[3px] border-dark">
                <SafeImage
                  src={ensAvatar || undefined}
                  className="h-[54px] w-[54px] rounded-full"
                  fallback={<CustomBoringAvatar size={54} name={address} />}
                />
              </div>
              <div className="flex translate-y-1 flex-row items-center gap-1">
                <span className="max-w-[10rem] overflow-hidden text-ellipsis text-sm">
                  {ensName ?? udInfo.name ?? accountShort}
                </span>
                <DocumentDuplicateIcon className="h-3 w-3" />
              </div>
            </div>
          </button>

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
