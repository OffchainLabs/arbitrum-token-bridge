import { useEffect, useMemo, useState } from 'react'
import { useCopyToClipboard } from 'react-use'
import { Popover } from '@headlessui/react'
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  LogoutIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/outline'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Resolution } from '@unstoppabledomains/resolution'
import BoringAvatar from 'boring-avatars'
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
import { getExplorerUrl } from '../../util/networks'
import { useAppContextActions } from '../App/AppContext'
import { useNewFeatureIndicator } from '../../hooks/useNewFeatureIndicator'
import { TransactionHistoryTooltip } from '../TransactionHistory/TransactionHistoryTooltip'
import { trackEvent } from '../../util/AnalyticsUtils'
import { shortenAddress } from '../../util/CommonUtils'

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

export function HeaderAccountPopover() {
  const l1Provider = useProvider({ chainId: 1 })
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const { chain } = useNetwork()
  const [, copyToClipboard] = useCopyToClipboard()

  const { openTransactionHistoryPanel } = useAppContextActions()

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

  // check local-storage for viewed flag
  const [txHistoryViewedOnce, setTxHistoryViewedOnce] =
    useNewFeatureIndicator('tx-history')

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

  function disconnectWallet() {
    disconnect()
  }

  function openTransactionHistory() {
    openTransactionHistoryPanel()
    trackEvent('Open Transaction History Click')
  }

  const headerItemsClassName =
    'arb-hover flex w-full flex-row items-center space-x-2 px-12 py-2 text-lg lg:text-sm font-light text-white hover:bg-blue-arbitrum lg:px-4'

  return (
    <Popover className="relative z-50 w-full lg:w-max">
      <TransactionHistoryTooltip
        isVisible={!txHistoryViewedOnce}
        onClose={() => setTxHistoryViewedOnce(true)}
      >
        <Popover.Button
          className="arb-hover flex w-full justify-start rounded-full py-3 px-6 lg:w-max lg:p-0"
          onClick={() => setTxHistoryViewedOnce(true)}
          role="button"
          aria-label={`Account Header Button`}
        >
          <div>
            <div className="flex flex-row items-center space-x-3 rounded-full lg:bg-dark lg:px-4 lg:py-2">
              <SafeImage
                src={ensAvatar || undefined}
                className="h-10 w-10 rounded-full"
                fallback={<CustomBoringAvatar size={40} name={address} />}
              />
              <span className="text-2xl font-medium text-white lg:text-base lg:font-normal">
                {ensName ?? udInfo.name ?? accountShort}
              </span>

              <ChevronDownIcon className="h-4 w-4 text-white" />
            </div>
          </div>
        </Popover.Button>
      </TransactionHistoryTooltip>
      <Transition>
        <Popover.Panel className="relative flex flex-col overflow-hidden rounded-md bg-dark pb-2 lg:absolute lg:mt-1 lg:shadow-[0px_4px_20px_rgba(0,0,0,0.2)]">
          {/* Profile photo with address */}
          <div className="flex flex-row justify-between">
            <Transition show={showCopied}>
              <span className="absolute left-[90px] top-[2rem] z-10 text-xs font-light text-white">
                Copied to clipboard!
              </span>
            </Transition>
            <button
              className="relative hidden flex-row items-center px-4 py-2 pt-[1rem] text-gray-7 hover:bg-blue-arbitrum hover:text-white lg:flex"
              onClick={() => copy(ensName ?? udInfo.name ?? address ?? '')}
            >
              {/* Blurred background */}
              <div className="absolute inset-0 flex h-[3rem] w-full flex-col items-center overflow-hidden bg-dark text-center">
                <div className="scale-400 blur-2xl filter">
                  <SafeImage
                    className="h-100 w-100 rounded-full"
                    src={ensAvatar || undefined}
                    fallback={<CustomBoringAvatar size={200} name={address} />}
                  />
                </div>
              </div>

              {/* Actual image and account name */}
              <div className="relative z-10 flex flex-row items-center space-x-2">
                <div className="box-content rounded-full border-[4px] border-dark">
                  <SafeImage
                    src={ensAvatar || undefined}
                    className="h-14 w-14 rounded-full"
                    fallback={<CustomBoringAvatar size={56} name={address} />}
                  />
                </div>
                <div className="flex translate-y-[15px] flex-row items-center space-x-3">
                  <span className="max-w-[10rem] overflow-hidden text-ellipsis text-sm font-normal">
                    {ensName ?? udInfo.name ?? accountShort}
                  </span>
                  <DocumentDuplicateIcon className="h-4 w-4" />
                </div>
              </div>
            </button>
          </div>

          <div className="flex w-full flex-col justify-between lg:flex-col lg:items-end lg:px-0">
            {/* Transactions button */}
            <button
              className={headerItemsClassName}
              onClick={openTransactionHistory}
            >
              <DocumentTextIcon className="h-4 w-4 text-white" />
              <span>Transactions</span>

              <span className="rounded-md bg-red-600 px-2 text-xs text-white lg:!ml-auto">
                NEW
              </span>
            </button>

            {/* Explorer button */}
            <ExternalLink
              href={`${getExplorerUrl(chain?.id ?? -1)}/address/${address}`}
              className={headerItemsClassName}
            >
              <ExternalLinkIcon className="h-4 w-4 text-white" />
              <span>Explorer</span>
            </ExternalLink>

            {/* Disconnect button */}
            <button className={headerItemsClassName} onClick={disconnectWallet}>
              <LogoutIcon className="h-4 w-4 text-white" />
              <span>Disconnect</span>
            </button>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  )
}
