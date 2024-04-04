import {
  MenuItem,
  MenuItemExpandable,
  MenuItemContent,
  MenuItemHeader
} from '@offchainlabs/cobalt'
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

import { getExplorerUrl, isNetwork } from '../../util/networks'
import { useAppContextActions } from '../App/AppContext'
import { trackEvent } from '../../util/AnalyticsUtils'
import { shortenAddress } from '../../util/CommonUtils'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useNetworks } from '../../hooks/useNetworks'
import { useAccountType } from '../../hooks/useAccountType'
import { SafeImage } from '../common/SafeImage'

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

export const AccountMenuItem = ({}) => {
  const l1Provider = useProvider({ chainId: 1 })
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const { chain } = useNetwork()
  const [{ sourceChain }] = useNetworks()
  const { isTestnet } = isNetwork(sourceChain.id)
  const [, copyToClipboard] = useCopyToClipboard()
  const isSmallScreen = useMedia('(max-width: 639px)')
  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()

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

  return (
    <MenuItemExpandable
      title={ensName ?? accountShort}
      Icon={
        <SafeImage
          src={ensAvatar || undefined}
          className="h-6 w-6 rounded-full sm:h-8 sm:w-8"
          fallback={<CustomBoringAvatar size={24} name={address} />}
        />
      }
    >
      <MenuItemContent>
        <MenuItem
          title="Transactions"
          Icon={<DocumentTextIcon className="h-[18px] w-[18px]" />}
          onClick={openTransactionHistory}
        />
        <MenuItem
          title="Explorer"
          Icon={<ArrowTopRightOnSquareIcon className="h-[18px] w-[18px]" />}
          href={`${getExplorerUrl(chain.id)}/address/${address}`}
        />
        <MenuItem
          title="Settings"
          Icon={<Cog6ToothIcon className="h-[18px] w-[18px]" />}
          onClick={() => setQueryParams({ settingsOpen: true })}
        />
        <MenuItem
          title="Disconnect"
          Icon={<ArrowLeftOnRectangleIcon className="h-[18px] w-[18px]" />}
          onClick={() => disconnect()}
        />
      </MenuItemContent>
    </MenuItemExpandable>
  )
}
