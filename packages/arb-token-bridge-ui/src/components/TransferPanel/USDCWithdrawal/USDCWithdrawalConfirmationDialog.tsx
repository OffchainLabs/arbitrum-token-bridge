import { useState } from 'react'
import { useChainId } from 'wagmi'

import { Tab, Dialog as HeadlessUIDialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

import { Dialog, UseDialogProps } from '../../common/Dialog'
import { Button } from '../../common/Button'
import { ExternalLink } from '../../common/ExternalLink'
import {
  SpecialTokenSymbol,
  USDCFastBridges,
  FastBridgeInfo
} from '../../../util/fastBridges'
import { TabButton } from '../../common/Tab'
import { BridgesTable } from '../../common/BridgesTable'
import { useNetworksAndSigners } from '../../../hooks/useNetworksAndSigners'
import {
  getExplorerUrl,
  getNetworkName,
  isNetwork
} from '../../../util/networks'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { USDCWithdrawalConfirmationDialogCheckbox } from './USDCWithdrawalConfirmationDialogCheckbox'
import { useAccountType } from '../../../hooks/useAccountType'

export function USDCWithdrawalConfirmationDialog(
  props: UseDialogProps & { amount: string }
) {
  const { l1, l2 } = useNetworksAndSigners()
  const chainId = useChainId()
  const [allCheckboxesCheched, setAllCheckboxesChecked] = useState(false)
  const { isEOA } = useAccountType()

  const { isArbitrumGoerli } = isNetwork(l2.network.id)

  const from = l2.network
  const to = l1.network
  const toNetworkName = getNetworkName(to.id)
  const tokenSymbol = SpecialTokenSymbol.USDC

  const fastBridges: FastBridgeInfo[] = USDCFastBridges.map(USDCFastBridge => ({
    name: USDCFastBridge.name,
    imageSrc: USDCFastBridge.imageSrc,
    href: USDCFastBridge.getHref({
      from: from.id,
      to: to.id,
      fromTokenAddress: isArbitrumGoerli
        ? CommonAddress.ArbitrumGoerli.USDC
        : CommonAddress.ArbitrumOne.USDC,
      toTokenAddress: isArbitrumGoerli
        ? CommonAddress.Goerli.USDC
        : CommonAddress.Mainnet.USDC,
      amount: props.amount,
      transferMode: 'withdraw'
    })
  }))

  return (
    <Dialog {...props} isCustom>
      <div className="flex flex-col md:min-w-[725px]">
        <Tab.Group>
          <div className="flex flex-row items-center justify-between bg-ocl-blue px-8 py-4">
            <HeadlessUIDialog.Title className="text-2xl font-medium text-white">
              Move funds to {toNetworkName}
            </HeadlessUIDialog.Title>
            <button
              className="arb-hover"
              onClick={() => {
                props.onClose(false)
              }}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>

          <Tab.List className="bg-ocl-blue">
            <TabButton>Use a fast bridge</TabButton>
            {isEOA && <TabButton>Use Circle&apos;s bridge (USDC)</TabButton>}
          </Tab.List>

          <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
            <div className="flex flex-col space-y-3 font-light">
              <p>
                Receive{' '}
                <ExternalLink
                  className="arb-hover text-blue-link underline"
                  href={
                    isArbitrumGoerli
                      ? `https://goerli.etherscan.io/token/${CommonAddress.Goerli.USDC}`
                      : `https://etherscan.io/token/${CommonAddress.Mainnet.USDC}`
                  }
                >
                  USDC
                </ExternalLink>{' '}
                on {toNetworkName} using a third-party bridge with Circle&apos;s{' '}
                <ExternalLink
                  className="arb-hover text-blue-link underline"
                  href="https://www.circle.com/en/cross-chain-transfer-protocol"
                >
                  Cross-Chain Transfer Protocol
                </ExternalLink>{' '}
                integrated.
              </p>
            </div>

            <BridgesTable
              bridgeList={fastBridges}
              selectedNonCanonicalToken={tokenSymbol}
            />
            <div className="mt-2 flex flex-row justify-end space-x-2">
              <Button variant="secondary" onClick={() => props.onClose(false)}>
                Cancel
              </Button>
            </div>
          </Tab.Panel>

          {isEOA && (
            <Tab.Panel className="flex flex-col space-y-3 px-8 py-4">
              <div className="flex flex-col space-y-3">
                <p className="font-light">
                  Receive{' '}
                  <ExternalLink
                    className="arb-hover text-blue-link underline"
                    href={`${getExplorerUrl(chainId)}/token/${
                      CommonAddress.ArbitrumOne
                    }`}
                  >
                    USDC
                  </ExternalLink>{' '}
                  on {toNetworkName} using Arbitrum&apos;s native bridge with
                  Circle&apos;s{' '}
                  <ExternalLink
                    className="arb-hover text-blue-link underline"
                    href="https://www.circle.com/en/cross-chain-transfer-protocol"
                  >
                    Cross-Chain Transfer Protocol
                  </ExternalLink>{' '}
                  integrated.
                </p>

                <div className="flex flex-col space-y-6">
                  <USDCWithdrawalConfirmationDialogCheckbox
                    onAllCheckboxesCheched={() => {
                      setAllCheckboxesChecked(true)
                    }}
                    onChange={checked => {
                      if (!checked) {
                        setAllCheckboxesChecked(false)
                      }
                    }}
                  />
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
                  disabled={!allCheckboxesCheched}
                  onClick={() => {
                    props.onClose(true)
                    setAllCheckboxesChecked(false)
                  }}
                >
                  Confirm
                </Button>
              </div>
            </Tab.Panel>
          )}
        </Tab.Group>
      </div>
    </Dialog>
  )
}
