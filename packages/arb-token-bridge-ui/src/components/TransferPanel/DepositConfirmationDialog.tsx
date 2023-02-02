import { Fragment, useState } from 'react'
import { useCopyToClipboard } from 'react-use'
import { Tab, Dialog as HeadlessUIDialog } from '@headlessui/react'
import { DocumentDuplicateIcon, XIcon } from '@heroicons/react/outline'

import { Dialog, UseDialogProps } from '../common/Dialog'
import { Button } from '../common/Button'
import { ExternalLink } from '../common/ExternalLink'
import {
  NonCanonicalTokenAddresses,
  NonCanonicalTokenNames,
  NonCanonicalTokensBridgeInfo,
  FastBridgeNames,
  getFastBridges
} from '../../util/fastBridges'
import { TabButton } from '../common/Tab'
import { BridgesTable } from '../common/BridgesTable'
import { useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getNetworkName, isNetwork } from '../../util/networks'
import { trackEvent } from '../../util/AnalyticsUtils'

export function DepositConfirmationDialog(
  props: UseDialogProps & { amount: string }
) {
  const {
    app: { selectedToken }
  } = useAppState()
  const { l1, l2, isConnectedToArbitrum } = useNetworksAndSigners()
  const networkName = getNetworkName(l2.network.chainID)
  const { isArbitrumOne } = isNetwork(l2.network.chainID)

  const [, copyToClipboard] = useCopyToClipboard()
  const [showCopied, setShowCopied] = useState(false)

  const from = isConnectedToArbitrum ? l2.network : l1.network
  const to = isConnectedToArbitrum ? l1.network : l2.network

  const tokenSymbol = selectedToken?.symbol as NonCanonicalTokenNames
  const tokenAddress = selectedToken?.address as NonCanonicalTokenAddresses
  const bridgeInfo = NonCanonicalTokensBridgeInfo[tokenAddress]

  if (!bridgeInfo) {
    return null
  }

  const tokenSymbolOnArbitrum =
    tokenAddress && bridgeInfo && bridgeInfo.tokenSymbolOnArbitrum

  const fastBridges = [
    ...getFastBridges(from.chainID, to.chainID, tokenSymbol, props.amount)
  ].filter(bridge => {
    return (
      tokenSymbol &&
      (bridgeInfo.supportedBridges as readonly FastBridgeNames[]).includes(
        bridge.name
      )
    )
  })

  function copy(value: string) {
    setShowCopied(true)
    copyToClipboard(value)
    setTimeout(() => setShowCopied(false), 1000)
  }

  return (
    <Dialog {...props} isCustom>
      <div className="flex flex-col md:min-w-[725px] md:max-w-[725px]">
        <Tab.Group>
          <div className="flex flex-row items-center justify-between bg-blue-arbitrum px-8 py-4">
            <HeadlessUIDialog.Title className="text-2xl font-medium text-white">
              Move funds to {networkName}
            </HeadlessUIDialog.Title>
            <button
              className="arb-hover"
              onClick={() => {
                props.onClose(false)
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
                    href={bridgeInfo.learnMoreUrl}
                    className="underline"
                  >
                    Learn more
                  </ExternalLink>
                  .
                </p>
              </div>

              <BridgesTable
                bridgeList={fastBridges}
                selectedNonCanonicalToken={tokenSymbol}
              />
              <div className="mt-2 flex flex-row justify-end space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => props.onClose(false)}
                >
                  Cancel
                </Button>
              </div>
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
                    Transfer on Arbitrum’s bridge to get {tokenSymbolOnArbitrum}
                  </li>
                  <li>
                    Transfer on {tokenSymbol}&apos;s bridge to swap{' '}
                    {tokenSymbolOnArbitrum} for {tokenSymbol}
                  </li>
                </ol>
                <div>
                  <button
                    className="arb-hover ml-4 rounded-xl border border-blue-arbitrum bg-gray-300 px-6 py-3"
                    onClick={() => {
                      copy(bridgeInfo.bridgeUrl)
                      trackEvent(`${tokenSymbol}: Copy Bridge Link Click`)
                    }}
                  >
                    <div className="flex flex-row items-center space-x-3">
                      <span className="font-light">
                        {showCopied
                          ? 'Copied to clipboard!'
                          : `Copy link for ${tokenSymbol} bridge`}
                      </span>
                      {!showCopied && (
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-row justify-end space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => props.onClose(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    props.onClose(true)
                    trackEvent(`${tokenSymbol}: Use Arbitrum Bridge Click`)
                  }}
                >
                  I want to do two swaps
                </Button>
              </div>
            </Tab.Panel>
          )}
        </Tab.Group>
      </div>
    </Dialog>
  )
}
