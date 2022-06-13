import { Fragment, useEffect, useMemo, useState } from 'react'
import { useCopyToClipboard } from 'react-use'
import { useWallet } from '@arbitrum/use-wallet'
import { Popover, Tab } from '@headlessui/react'
import {
  ClipboardCopyIcon,
  ExternalLinkIcon,
  LogoutIcon
} from '@heroicons/react/outline'

import { Transition } from './Transition'
import { ExternalLink } from './ExternalLink'
import { modalProviderOpts } from '../../util/modelProviderOpts'
import {
  useNetworksAndSigners,
  UseNetworksAndSignersStatus
} from '../../hooks/useNetworksAndSigners'
import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import { TransactionsTable } from '../TransactionsTable/TransactionsTable'

type ENSInfo = { name: string | null; avatar: string | null }
const ensInfoDefaults: ENSInfo = { name: null, avatar: null }

function Avatar({ src, className }: { src: string | null; className: string }) {
  const commonClassName = 'rounded-full border border-white'

  if (!src) {
    return <div className={`bg-v3-orange ${commonClassName} ${className}`} />
  }

  return (
    <img alt="Avatar" src={src} className={`${commonClassName} ${className}`} />
  )
}

function isDeposit(tx: MergedTransaction) {
  return tx.direction === 'deposit' || tx.direction === 'deposit-l1'
}

export function HeaderAccountPopover() {
  const { connect, disconnect, account, web3Modal } = useWallet()
  const { status, l1, l2, isConnectedToArbitrum } = useNetworksAndSigners()
  const [, copyToClipboard] = useCopyToClipboard()
  const {
    app: { mergedTransactions }
  } = useAppState()

  const [ensInfo, setENSInfo] = useState<ENSInfo>(ensInfoDefaults)

  useEffect(() => {
    async function resolveENSInfo() {
      if (account && l1.signer) {
        const [name, avatar] = await Promise.all([
          l1.signer.provider.lookupAddress(account),
          l1.signer.provider.getAvatar(account)
        ])

        setENSInfo({ name, avatar })
      }
    }

    resolveENSInfo()
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

  function disconnectWallet() {
    disconnect()
    web3Modal?.clearCachedProvider()
    window.location.reload()
  }

  if (status === UseNetworksAndSignersStatus.LOADING) {
    return null
  }

  if (status === UseNetworksAndSignersStatus.NOT_CONNECTED) {
    return (
      <button
        onClick={() => connect(modalProviderOpts)}
        type="button"
        className="arb-hover rounded-full py-3 text-2xl font-medium text-white lg:bg-v3-lime-dark lg:px-6 lg:text-base lg:font-normal"
      >
        Connect Wallet
      </button>
    )
  }

  return (
    <Popover className="relative z-50 max-w-full">
      <Popover.Button className="arb-hover flex w-full justify-center rounded-full lg:w-max">
        <div className="py-3 lg:py-0">
          <div className="flex flex-row items-center space-x-3 rounded-full lg:bg-v3-dark lg:px-3 lg:py-2">
            <Avatar src={ensInfo.avatar} className="h-8 w-8" />
            <span className="text-2xl font-medium text-white lg:text-base lg:font-normal">
              {ensInfo.name || accountShort}
            </span>
          </div>
        </div>
      </Popover.Button>
      <Transition>
        <Popover.Panel className="lg:min-w-896px account-popover-drop-shadow relative right-0 flex h-96 flex-col lg:absolute lg:mt-4">
          <div className="h-24 bg-v3-arbitrum-dark-blue p-4 lg:rounded-tl-md lg:rounded-tr-md">
            <div className="flex flex-row justify-between">
              <button
                className="arb-hover hidden flex-row items-center space-x-4 rounded-full lg:flex"
                onClick={() => copyToClipboard(ensInfo.name || account || '')}
              >
                <Avatar src={ensInfo.avatar} className="h-14 w-14" />
                <div className="flex flex-row items-center space-x-3">
                  <span className="text-2xl font-normal text-white">
                    {ensInfo.name || accountShort}
                  </span>
                  <ClipboardCopyIcon className="h-6 w-6 text-white" />
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
                      className={`rounded-tl-lg rounded-tr-lg px-4 py-2 ${
                        selected && `bg-gray-200`
                      }`}
                    >
                      Deposits
                    </button>
                  )}
                </Tab>
                <Tab as={Fragment}>
                  {({ selected }) => (
                    <button
                      className={`rounded-tl-lg rounded-tr-lg px-4 py-2 ${
                        selected && `bg-gray-200`
                      }`}
                    >
                      Withdrawals
                    </button>
                  )}
                </Tab>
              </Tab.List>
              <Tab.Panel>
                <TransactionsTable transactions={deposits} overflowX={true} />
              </Tab.Panel>
              <Tab.Panel>
                <TransactionsTable
                  transactions={withdrawals}
                  overflowX={true}
                />
              </Tab.Panel>
            </Tab.Group>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  )
}
