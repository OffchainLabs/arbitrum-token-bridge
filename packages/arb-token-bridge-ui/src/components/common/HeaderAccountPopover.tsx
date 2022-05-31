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

export function HeaderAccountPopover() {
  const { connect, disconnect, account, web3Modal } = useWallet()
  const { status, l1, l2, isConnectedToArbitrum } = useNetworksAndSigners()
  const [, copyToClipboard] = useCopyToClipboard()
  const {
    app: { depositsTransformed, withdrawalsTransformed }
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

  if (status === UseNetworksAndSignersStatus.NOT_CONNECTED) {
    return (
      <button
        onClick={() => connect(modalProviderOpts)}
        type="button"
        className="lg:bg-v3-lime-dark lg:px-6 py-3 rounded-full text-2xl lg:text-base text-white font-medium lg:font-normal arb-hover"
      >
        Connect Wallet
      </button>
    )
  }

  return (
    <Popover className="relative z-50 max-w-full">
      <Popover.Button className="flex w-full justify-center lg:w-max arb-hover">
        <div className="py-3 lg:py-0">
          <div className="flex flex-row space-x-3 items-center lg:px-3 lg:py-2 lg:bg-v3-dark rounded-full">
            <Avatar src={ensInfo.avatar} className="h-8 w-8" />
            <span className="text-white text-2xl lg:text-base font-medium lg:font-normal">
              {ensInfo.name || accountShort}
            </span>
          </div>
        </div>
      </Popover.Button>
      <Transition>
        <Popover.Panel className="flex flex-col relative lg:absolute right-0 h-96 lg:min-w-896px lg:mt-4 bg-white account-popover-drop-shadow lg:rounded-md">
          <div className="h-24 bg-v3-arbitrum-dark-blue p-4">
            <div className="flex flex-row justify-between">
              <button
                className="hidden lg:flex flex-row space-x-4 items-center arb-hover"
                onClick={() => copyToClipboard(ensInfo.name || account || '')}
              >
                <Avatar src={ensInfo.avatar} className="h-14 w-14" />
                <div className="flex flex-row items-center space-x-3">
                  <span className="text-white text-2xl font-normal">
                    {ensInfo.name || accountShort}
                  </span>
                  <ClipboardCopyIcon className="h-6 w-6 text-white" />
                </div>
              </button>
              <div className="w-full flex flex-row lg:flex-col justify-between lg:items-end px-6 lg:px-0">
                <ExternalLink
                  href={`${currentNetwork?.explorerUrl}/address/${account}`}
                  className="flex flex-row items-center space-x-1 text-white font-light arb-hover hover:underline"
                >
                  <ExternalLinkIcon className="h-4 w-4 text-white" />
                  <span>View on explorer</span>
                </ExternalLink>
                <button
                  className="flex flex-row items-center space-x-1 text-white font-light arb-hover"
                  onClick={disconnectWallet}
                >
                  <LogoutIcon className="h-4 w-4 text-white" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex-grow overflow-y-scroll lg:p-4">
            <div className="px-4 py-2 lg:px-0 lg:py-0 lg:pb-2">
              <span>Transaction History</span>
            </div>
            <Tab.Group>
              <Tab.List>
                <Tab as={Fragment}>
                  {({ selected }) => (
                    <button
                      className={`px-4 py-2 rounded-tl-lg rounded-tr-lg ${
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
                      className={`px-4 py-2 rounded-tl-lg rounded-tr-lg ${
                        selected && `bg-gray-200`
                      }`}
                    >
                      Withdrawals
                    </button>
                  )}
                </Tab>
              </Tab.List>
              <Tab.Panel>
                <TransactionsTable
                  transactions={depositsTransformed}
                  overflowX={true}
                />
              </Tab.Panel>
              <Tab.Panel>
                <TransactionsTable
                  transactions={withdrawalsTransformed}
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
