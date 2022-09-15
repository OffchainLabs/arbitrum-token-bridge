import { Fragment, useEffect, useMemo, useState } from 'react'
import { useCopyToClipboard } from 'react-use'
import { useWallet } from '@arbitrum/use-wallet'
import { Popover, Tab } from '@headlessui/react'
import { ExternalLinkIcon, LogoutIcon } from '@heroicons/react/outline'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Resolution } from '@unstoppabledomains/resolution';
import BoringAvatar from 'boring-avatars'

import { Transition } from './Transition'
import { ExternalLink } from './ExternalLink'
import { PendingWithdrawalsLoadedState } from '../../util'
import {
  useNetworksAndSigners,
  UseNetworksAndSignersStatus
} from '../../hooks/useNetworksAndSigners'
import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import {
  TransactionsTable,
  TransactionsDataStatus
} from '../TransactionsTable/TransactionsTable'
import { SafeImage } from './SafeImage'
import { ReactComponent as CustomClipboardCopyIcon } from '../../assets/copy.svg'

type ENSInfo = { name: string | null; avatar: string | null }
const ensInfoDefaults: ENSInfo = { name: null, avatar: null }

type UDInfo = { name: string | null }
const udInfoDefaults: UDInfo = { name: null }

function getTransactionsDataStatus(
  pwLoadedState: PendingWithdrawalsLoadedState
): TransactionsDataStatus {
  switch (pwLoadedState) {
    case PendingWithdrawalsLoadedState.LOADING:
      return 'loading'

    case PendingWithdrawalsLoadedState.ERROR:
      return 'error'

    case PendingWithdrawalsLoadedState.READY:
      return 'success'
  }
}

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

function isDeposit(tx: MergedTransaction) {
  return tx.direction === 'deposit' || tx.direction === 'deposit-l1'
}

async function tryLookupUDName(address: string) {
  const UDresolution = Resolution.fromEthersProvider({});
  try {
    return await UDresolution.reverse(address)
  } catch (error) {
    return null
  }
}

async function tryLookupAddress(
  provider: JsonRpcProvider,
  address: string
): Promise<string | null> {
  try {
    return await provider.lookupAddress(address)
  } catch (error) {
    return null
  }
}

async function tryGetAvatar(
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
  const [, copyToClipboard] = useCopyToClipboard()
  const {
    app: { mergedTransactions, pwLoadedState }
  } = useAppState()

  const [showCopied, setShowCopied] = useState(false)
  const [ensInfo, setENSInfo] = useState<ENSInfo>(ensInfoDefaults)
  const [udInfo, setUDInfo] = useState<UDInfo>(udInfoDefaults)

  useEffect(() => {
    async function resolveNameServiceInfo() {
      if (account && l1.signer) {
        const [ensName, avatar, udName] = await Promise.all([
          tryLookupAddress(l1.signer.provider, account),
          tryGetAvatar(l1.signer.provider, account),
          tryLookupUDName(account)
        ])
        setENSInfo({ name: ensName, avatar })
        setUDInfo({ name: udName })
      }
    }

    resolveNameServiceInfo()
  }, [account, l1.signer])

  const [deposits, withdrawals] = useMemo(() => {
    const _deposits: MergedTransaction[] = []
    const _withdrawals: MergedTransaction[] = []

    mergedTransactions.forEach(tx => {
      if (isDeposit(tx)) {
        _deposits.push(tx)
      } else {
        _withdrawals.push(tx)
      }
    })

    return [_deposits, _withdrawals]
  }, [mergedTransactions])

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

  return (
    <Popover className="relative z-50 w-full lg:w-max">
      <Popover.Button className="arb-hover flex w-full justify-center rounded-full lg:w-max">
        <div className="py-3 lg:py-0">
          <div className="flex flex-row items-center space-x-3 rounded-full lg:bg-dark lg:px-4 lg:py-2">
            <SafeImage
              src={ensInfo.avatar || undefined}
              className="h-8 w-8 rounded-full"
              fallback={<CustomBoringAvatar size={32} name={account} />}
            />
            <span className="text-2xl font-medium text-white lg:text-base lg:font-normal">
              {ensInfo.name ?? udInfo.name ?? accountShort}
            </span>
          </div>
        </div>
      </Popover.Button>
      <Transition>
        <Popover.Panel className="relative right-0 flex h-96 flex-col rounded-md lg:absolute lg:mt-4 lg:min-w-[896px] lg:shadow-[0px_4px_20px_rgba(0,0,0,0.2)]">
          <div className="bg-blue-arbitrum p-4 lg:rounded-tl-md lg:rounded-tr-md">
            <div className="flex flex-row justify-between">
              <Transition show={showCopied}>
                <span className="absolute left-[89px] top-4 text-xs font-light text-white">
                  Copied to clipboard!
                </span>
              </Transition>
              <button
                className="arb-hover hidden flex-row items-center space-x-4 rounded-full lg:flex"
                onClick={() => copy(ensInfo.name ?? udInfo.name ?? account ?? '')}
              >
                <SafeImage
                  src={ensInfo.avatar || undefined}
                  className="h-14 w-14 rounded-full"
                  fallback={<CustomBoringAvatar size={56} name={account} />}
                />
                <div className="flex flex-row items-center space-x-3">
                  <span className="text-2xl font-normal text-white">
                    {ensInfo.name ?? udInfo.name ?? accountShort}
                  </span>
                  <CustomClipboardCopyIcon className="h-6 w-6 text-white" />
                </div>
              </button>
              <div className="flex w-full flex-row justify-between px-6 lg:flex-col lg:items-end lg:px-0">
                <ExternalLink
                  href={`${currentNetwork?.explorerUrl}/address/${account}`}
                  className="arb-hover flex flex-row items-center space-x-1 font-light text-white hover:underline"
                >
                  <ExternalLinkIcon className="h-4 w-4 text-white" />
                  <span>View on explorer</span>
                </ExternalLink>
                <button
                  className="arb-hover flex flex-row items-center space-x-1 font-light text-white"
                  onClick={disconnectWallet}
                >
                  <LogoutIcon className="h-4 w-4 text-white" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex-grow overflow-y-scroll bg-white lg:rounded-bl-md lg:rounded-br-md lg:p-4">
            <div className="px-4 py-2 lg:px-0 lg:py-0 lg:pb-2">
              <span>Transaction History</span>
            </div>
            <Tab.Group>
              <Tab.List>
                <Tab as={Fragment}>
                  {({ selected }) => (
                    <button
                      className={`${
                        !selected ? 'arb-hover' : ''
                      } rounded-tl-lg rounded-tr-lg px-4 py-2 ${
                        selected &&
                        `border-2 border-b-0 border-blue-arbitrum border-opacity-80 bg-gray-3`
                      }`}
                    >
                      Deposits
                    </button>
                  )}
                </Tab>
                <Tab as={Fragment}>
                  {({ selected }) => (
                    <button
                      className={`${
                        !selected ? 'arb-hover' : ''
                      } rounded-tl-lg rounded-tr-lg px-4 py-2 ${
                        selected &&
                        `border-2 border-b-0 border-blue-arbitrum border-opacity-80 bg-gray-3`
                      }`}
                    >
                      Withdrawals
                    </button>
                  )}
                </Tab>
              </Tab.List>
              <Tab.Panel>
                <TransactionsTable
                  // Currently we load deposit history from local cache, so it's always a success
                  status="success"
                  transactions={deposits}
                  className="-mt-0.5 border-2 border-blue-arbitrum border-opacity-80 bg-gray-3"
                />
              </Tab.Panel>
              <Tab.Panel>
                <TransactionsTable
                  status={getTransactionsDataStatus(pwLoadedState)}
                  transactions={withdrawals}
                  className="-mt-0.5 border-2 border-blue-arbitrum border-opacity-80 bg-gray-3"
                />
              </Tab.Panel>
            </Tab.Group>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  )
}
