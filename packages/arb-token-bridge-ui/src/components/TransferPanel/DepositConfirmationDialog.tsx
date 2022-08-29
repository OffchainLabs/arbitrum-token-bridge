import { Fragment, useState } from 'react'
import { useCopyToClipboard } from 'react-use'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { Tab, Dialog as HeadlessUIDialog } from '@headlessui/react'
import { XIcon, ExternalLinkIcon } from '@heroicons/react/outline'

import { Transition } from '../common/Transition'
import { ExternalLink } from '../common/ExternalLink'
import { CanonicalTokensBridgeInfo, getFastBridges } from 'src/util/fastBridges'
import { TabButton } from '../common/Tab'
import { useAppState } from 'src/state'
import { useNetworksAndSigners } from 'src/hooks/useNetworksAndSigners'
import { getNetworkName, isNetwork } from 'src/util/networks'
import { ReactComponent as CustomClipboardCopyIcon } from '../../assets/copy.svg'

function FastBridgesTable() {
  // TODO: Add Phantom tracking event
  const { l1, l2, isConnectedToArbitrum } = useNetworksAndSigners()
  const from = isConnectedToArbitrum ? l2.network : l1.network
  const to = isConnectedToArbitrum ? l1.network : l2.network

  const {
    app: { selectedToken }
  } = useAppState()

  const fastBridges = [
    ...getFastBridges(from.chainID, to.chainID, selectedToken?.symbol || 'ETH')
  ].filter(bridge => {
    return (
      selectedToken &&
      CanonicalTokensBridgeInfo[selectedToken.symbol].supportedBridges.includes(
        bridge.name
      )
    )
  })

  const sortedFastBridges = fastBridges.sort((a, b) => {
    if (a.name < b.name) {
      return -1
    } else {
      return 1
    }
  })

  return (
    <table className="w-full border border-gray-5">
      <thead className="bg-gray-1 text-left">
        <tr className="text-gray-9">
          <th className="w-4/5 px-6 py-4 font-normal">Bridge</th>
          <th className="w-1/5 px-6 py-4 font-normal"></th>
        </tr>
      </thead>
      <tbody className="font-light">
        {sortedFastBridges.map(bridge => (
          <tr
            key={bridge.name}
            className="cursor-pointer border border-gray-5 hover:bg-cyan"
          >
            <td>
              <ExternalLink href={bridge.href}>
                <div className="flex h-16 items-center space-x-4 px-6">
                  <img
                    src={bridge.imageSrc}
                    alt={bridge.name}
                    className="h-8 w-8 rounded-full object-contain"
                  />
                  <span>{bridge.name}</span>
                </div>
              </ExternalLink>
            </td>
            <td>
              <ExternalLink
                href={bridge.href}
                className="arb-hover flex h-16 w-full items-center justify-center text-gray-6 hover:text-blue-arbitrum"
              >
                <ExternalLinkIcon className="h-5 w-5" />
              </ExternalLink>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function DepositConfirmationDialog(props: UseDialogProps) {
  const {
    app: { selectedToken }
  } = useAppState()
  const { l2 } = useNetworksAndSigners()
  const networkName = getNetworkName(l2.network)
  const { isArbitrumOne } = isNetwork(l2.network)

  const [, copyToClipboard] = useCopyToClipboard()
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0)
  const [showCopied, setShowCopied] = useState(false)

  function copy(value: string) {
    setShowCopied(true)
    copyToClipboard(value)
    setTimeout(() => setShowCopied(false), 1000)
  }

  return (
    <Dialog
      {...props}
      onClose={confirmed => {
        props.onClose(confirmed)
        setActiveTabIndex(0)
      }}
      actionButtonProps={{ hidden: activeTabIndex === 0 }}
      actionButtonTitle="I want to do two swaps"
    >
      <div className="flex flex-col md:min-w-[725px] md:max-w-[725px]">
        <Tab.Group onChange={setActiveTabIndex}>
          <div className="flex flex-row items-center justify-between bg-blue-arbitrum px-8 py-4">
            <HeadlessUIDialog.Title className="text-2xl font-medium text-white">
              Move funds to {networkName}
            </HeadlessUIDialog.Title>
            <button
              className="arb-hover"
              onClick={() => {
                props.onClose(false)
                setActiveTabIndex(0)
              }}
            >
              <XIcon className="h-6 w-6 text-white" />
            </button>
          </div>

          <Tab.List className="bg-blue-arbitrum">
            {isArbitrumOne && (
              <Tab as={Fragment}>
                {({ selected }) => (
                  <TabButton selected={selected}>
                    Use a third-party bridge
                  </TabButton>
                )}
              </Tab>
            )}
            <Tab as={Fragment}>
              {({ selected }) => (
                <TabButton selected={selected}>Use Arbitrum’s bridge</TabButton>
              )}
            </Tab>
          </Tab.List>

          {isArbitrumOne && selectedToken && (
            <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
              <div className="flex flex-col space-y-3">
                <p className="font-light">
                  To get the canonical variant of {selectedToken.symbol}{' '}
                  directly onto {networkName} you’ll have to use a bridge that{' '}
                  {selectedToken.symbol} has fully integrated with.{' '}
                  <ExternalLink
                    href={
                      CanonicalTokensBridgeInfo[selectedToken.symbol]
                        .learnMoreUrl
                    }
                    className="underline"
                  >
                    Learn more
                  </ExternalLink>
                  .
                </p>
              </div>

              <FastBridgesTable />
            </Tab.Panel>
          )}

          {selectedToken && (
            <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
              <div className="flex flex-col space-y-3">
                <p className="font-light">
                  If you choose to use Arbitrum’s bridge instead, you’ll have to
                  do two transfers.
                </p>
                <ol className="list-decimal px-4 font-light">
                  {/* TODO: are all tokens going to be structured like arbi{token_symbol}? */}
                  <li>
                    Transfer on Arbitrum’s bridge to get arbi
                    {selectedToken?.symbol}
                  </li>
                  <li>
                    Transfer on {selectedToken?.symbol}'s bridge to swap arbi
                    {selectedToken?.symbol} for {selectedToken?.symbol}
                  </li>
                </ol>
                <div>
                  <Transition show={showCopied}>
                    <span className="absolute left-[89px] top-4 text-xs font-light text-white">
                      Copied to clipboard!
                    </span>
                  </Transition>
                  <div>
                </div>

                <button
                  className="arb-hover bg-gray-300 border border-blue-arbitrum px-6 py-3 ml-4 rounded-xl"
                  onClick={() => copy(CanonicalTokensBridgeInfo[selectedToken.symbol].bridgeUrl)}
                >
                  <div className="flex flex-row items-center space-x-3">
                    <span className="font-light">
                      Copy link for {selectedToken?.symbol} bridge
                    </span>
                    <CustomClipboardCopyIcon className="h-6 w-6" />
                  </div>
                </button>
                </div>
              </div>
            </Tab.Panel>
          )}
        </Tab.Group>
      </div>
    </Dialog>
  )
}
