import { Fragment, useState } from 'react'
import { useCopyToClipboard } from 'react-use'
import { Tab, Dialog as HeadlessUIDialog } from '@headlessui/react'
import { XIcon } from '@heroicons/react/outline'

import { Dialog, UseDialogProps } from '../common/Dialog'
import { Transition } from '../common/Transition'
import { ExternalLink } from '../common/ExternalLink'
import {
  CanonicalTokenAddresses,
  CanonicalTokenNames,
  CanonicalTokensBridgeInfo,
  FastBridgeNames,
  getFastBridges
} from '../../util/fastBridges'
import { TabButton } from '../common/Tab'
import { BridgesTable } from '../common/BridgesTable'
import { useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getNetworkName, isNetwork } from '../../util/networks'
import { ReactComponent as CustomClipboardCopyIcon } from '../../assets/copy.svg'
import { trackEvent } from '../../util/AnalyticsUtils'

export function DepositConfirmationDialog(props: UseDialogProps) {
  const { app: { selectedToken } } = useAppState()
  const { l1, l2, isConnectedToArbitrum } = useNetworksAndSigners()
  const networkName = getNetworkName(l2.network)
  const { isArbitrumOne } = isNetwork(l2.network)

  const from = isConnectedToArbitrum ? l2.network : l1.network
  const to = isConnectedToArbitrum ? l1.network : l2.network

  const tokenSymbol = selectedToken?.symbol as CanonicalTokenNames
  const tokenAddress = selectedToken?.address as CanonicalTokenAddresses
  const swapTokenSymbol =
    tokenAddress && CanonicalTokensBridgeInfo[tokenAddress].swapTokenSymbol

  const fastBridges = [
    ...getFastBridges(from.chainID, to.chainID, tokenSymbol || 'ETH')
  ].filter(bridge => {
    return (
      tokenSymbol &&
      (
        CanonicalTokensBridgeInfo[tokenAddress]
          .supportedBridges as readonly FastBridgeNames[]
      ).includes(bridge.name)
    )
  })

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
        if (confirmed) {
          trackEvent(`${tokenSymbol}: Use Arbitrum Bridge Click`)
        }
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

          {isArbitrumOne && tokenSymbol && (
            <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
              <div className="flex flex-col space-y-3">
                <p className="font-light">
                  To get the canonical variant of {tokenSymbol} directly onto{' '}
                  {networkName} you’ll have to use a bridge that {tokenSymbol}{' '}
                  has fully integrated with.{' '}
                  <ExternalLink
                    href={CanonicalTokensBridgeInfo[tokenAddress].learnMoreUrl}
                    className="underline"
                  >
                    Learn more
                  </ExternalLink>
                  .
                </p>
              </div>

              <BridgesTable
                bridgeList={fastBridges}
                selectedCanonicalToken={tokenSymbol as CanonicalTokenNames}
              />
            </Tab.Panel>
          )}

          {tokenSymbol && (
            <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
              <div className="flex flex-col space-y-3">
                <p className="font-light">
                  If you choose to use Arbitrum’s bridge instead, you’ll have to
                  do two transfers.
                </p>
                <ol className="list-decimal px-4 font-light">
                  <li>
                    Transfer on Arbitrum’s bridge to get {swapTokenSymbol}
                  </li>
                  <li>
                    Transfer on {tokenSymbol}'s bridge to swap{' '}
                    {swapTokenSymbol} for {tokenSymbol}
                  </li>
                </ol>
                <div>
                  <Transition show={showCopied}>
                    <span className="absolute left-[89px] top-4 text-xs font-light text-white">
                      Copied to clipboard!
                    </span>
                  </Transition>
                  <div></div>

                  <button
                    className="arb-hover ml-4 rounded-xl border border-blue-arbitrum bg-gray-300 px-6 py-3"
                    onClick={() => {
                      copy(CanonicalTokensBridgeInfo[tokenAddress].bridgeUrl)
                      trackEvent(
                        `${
                          tokenSymbol as CanonicalTokenNames
                        }: Copy Bridge Link Click`
                      )
                    }}
                  >
                    <div className="flex flex-row items-center space-x-3">
                      <span className="font-light">
                        Copy link for {tokenSymbol} bridge
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
