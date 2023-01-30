import { useEffect, useMemo, useState } from 'react'
import { useCopyToClipboard } from 'react-use'
import { useWallet } from '@arbitrum/use-wallet'
import { Popover } from '@headlessui/react'
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  LogoutIcon,
  DocumentTextIcon
} from '@heroicons/react/outline'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Resolution } from '@unstoppabledomains/resolution'
import BoringAvatar from 'boring-avatars'

import { Transition } from './Transition'
import { ExternalLink } from './ExternalLink'
import {
  useNetworksAndSigners,
  UseNetworksAndSignersStatus
} from '../../hooks/useNetworksAndSigners'

import { SafeImage } from './SafeImage'
import { ReactComponent as CustomClipboardCopyIcon } from '../../assets/copy.svg'
import { getExplorerUrl } from '../../util/networks'
import { useActions } from '../../state'
import { useAppContextDispatch } from '../App/AppContext'

type ENSInfo = { name: string | null; avatar: string | null }
const ensInfoDefaults: ENSInfo = { name: null, avatar: null }

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

async function tryLookupENSName(
  provider: JsonRpcProvider,
  address: string
): Promise<string | null> {
  try {
    return await provider.lookupAddress(address)
  } catch (error) {
    return null
  }
}

async function tryLookupENSAvatar(
  provider: JsonRpcProvider,
  address: string
): Promise<string | null> {
  try {
    return await provider.getAvatar(address)
  } catch (error) {
    return null
  }
}

export function HeaderAccountPopover() {
  const { disconnect, account, web3Modal } = useWallet()
  const { status, l1, l2, isConnectedToArbitrum } = useNetworksAndSigners()
  const { provider: l1Provider } = l1
  const [, copyToClipboard] = useCopyToClipboard()

  const dispatch = useAppContextDispatch()

  const [showCopied, setShowCopied] = useState(false)
  const [ensInfo, setENSInfo] = useState<ENSInfo>(ensInfoDefaults)
  const [udInfo, setUDInfo] = useState<UDInfo>(udInfoDefaults)

  useEffect(() => {
    async function resolveNameServiceInfo() {
      if (account) {
        const [ensName, avatar, udName] = await Promise.all([
          tryLookupENSName(l1Provider, account),
          tryLookupENSAvatar(l1Provider, account),
          tryLookupUDName(l1Provider, account)
        ])
        setENSInfo({ name: ensName, avatar })
        setUDInfo({ name: udName })
      }
    }

    resolveNameServiceInfo()
  }, [account, l1Provider])

  const currentNetwork = useMemo(() => {
    if (status !== UseNetworksAndSignersStatus.CONNECTED) {
      return undefined
    }

    return isConnectedToArbitrum ? l2.network : l1.network
  }, [status, l1, l2, isConnectedToArbitrum])

  const accountShort = useMemo(() => {
    if (typeof account === 'undefined') {
      return ''
    }

    const len = account.length

    return `${account.substring(0, 5)}...${account.substring(len - 4, len)}`
  }, [account])

  function copy(value: string) {
    setShowCopied(true)
    copyToClipboard(value)
    setTimeout(() => setShowCopied(false), 1000)
  }

  function disconnectWallet() {
    disconnect()
    web3Modal?.clearCachedProvider()
    window.location.reload()
  }

  function openTransactionHistory() {
    dispatch({ type: 'layout.set_txhistory_panel_visible', payload: true })
  }

  const headerItemsClassName =
    'arb-hover flex w-full flex-row items-center space-x-2 px-[4rem] py-2 text-lg lg:text-base font-light text-white hover:bg-blue-arbitrum lg:px-4'

  return (
    <Popover className="relative z-50 w-full lg:w-max">
      <Popover.Button className="arb-hover flex w-full justify-start rounded-full p-4 lg:w-max lg:p-0">
        <div>
          <div className="flex flex-row items-center space-x-3 rounded-full lg:bg-dark lg:px-4 lg:py-2">
            <SafeImage
              src={ensInfo.avatar || undefined}
              className="h-8 w-8 rounded-full"
              fallback={<CustomBoringAvatar size={32} name={account} />}
            />
            <span className="text-2xl font-medium text-white lg:text-base lg:font-normal">
              {ensInfo.name ?? udInfo.name ?? accountShort}
            </span>

            <ChevronDownIcon className="h-4 w-4 text-white" />
          </div>
        </div>
      </Popover.Button>
      <Transition>
        <Popover.Panel className="relative flex flex-col overflow-hidden rounded-md bg-dark pb-2 lg:absolute lg:mt-4 lg:shadow-[0px_4px_20px_rgba(0,0,0,0.2)]">
          {/* Profile photo with address */}
          <div className="flex flex-row justify-between pb-2">
            <Transition show={showCopied}>
              <span className="absolute left-[89px] top-4 z-10 text-xs font-light text-white">
                Copied to clipboard!
              </span>
            </Transition>
            <button
              className="relative hidden flex-row items-center px-4 py-2 text-gray-7 hover:bg-blue-arbitrum hover:text-white lg:flex"
              onClick={() => copy(ensInfo.name ?? udInfo.name ?? account ?? '')}
            >
              {/* Blurred background */}
              <div className="absolute inset-0 -z-50 flex h-[40px] w-full flex-col items-center overflow-hidden bg-dark text-center">
                <div className="scale-400 blur-2xl filter">
                  <SafeImage
                    className="h-100 w-100 rounded-full"
                    src={ensInfo.avatar || undefined}
                    fallback={<CustomBoringAvatar size={200} name={account} />}
                  />
                </div>
              </div>

              {/* Actual image and account name */}
              <div className="relative z-10 flex flex-row items-center space-x-2">
                <div className="box-content rounded-full border-[5px] border-dark	">
                  <SafeImage
                    src={ensInfo.avatar || undefined}
                    className="h-14 w-14 rounded-full"
                    fallback={<CustomBoringAvatar size={56} name={account} />}
                  />
                </div>
                <div className="flex translate-y-[15px] transform flex-row items-center space-x-3">
                  <span className="text-md max-w-[10rem] overflow-hidden text-ellipsis font-normal">
                    {ensInfo.name ?? udInfo.name ?? accountShort}
                  </span>
                  <CustomClipboardCopyIcon className="h-4 w-4" />
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
            </button>

            {/* Explorer button */}
            <ExternalLink
              href={`${getExplorerUrl(
                currentNetwork?.chainID ?? -1
              )}/address/${account}`}
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
