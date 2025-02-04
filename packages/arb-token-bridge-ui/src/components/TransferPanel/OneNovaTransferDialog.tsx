import { Tab } from '@headlessui/react'
import Hop from '@/images/bridge/hop.png'

import { TabButton } from '../common/Tab'
import { BridgesTable } from '../common/BridgesTable'
import { SecurityNotGuaranteed } from './SecurityLabels'
import { Dialog, UseDialogProps } from '../common/Dialog'
import { FastBridgeInfo, FastBridgeNames } from '../../util/fastBridges'
import { getNetworkName, isNetwork } from '../../util/networks'
import { ChainId } from '../../types/ChainId'
import { ether } from '../../constants'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useNetworks } from '../../hooks/useNetworks'

/**
 * On the UI, user can select the pair Arbitrum One/Arbitrum Nova with the network selection dropdowns.
 * However, they are not valid pairs for transfer, so the latest selected chain will not be set as query param
 * and useNetworks will not save it.
 *
 * This function will use the currently selected chain in the source & destination chain pair to determine
 * which chain user has selected (but not stored in the query params or useNetworks).
 */
function getDialogSourceAndDestinationChains({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: ChainId
  destinationChainId: ChainId
}) {
  const { isArbitrumNova: isSourceChainNova } = isNetwork(sourceChainId)
  const { isArbitrumOne: isDestinationChainArbOne } =
    isNetwork(destinationChainId)

  if (isSourceChainNova || isDestinationChainArbOne) {
    return {
      selectedSourceChainId: ChainId.ArbitrumNova,
      selectedDestinationChainId: ChainId.ArbitrumOne
    }
  }
  // if source chain is Arbitrum One or
  // if destination chain is Arbitrum Nova
  return {
    selectedSourceChainId: ChainId.ArbitrumOne,
    selectedDestinationChainId: ChainId.ArbitrumNova
  }
}

export function OneNovaTransferDialog(props: UseDialogProps) {
  const [selectedToken] = useSelectedToken()
  const [{ amount }] = useArbQueryParams()
  const [{ sourceChain, destinationChain }] = useNetworks()

  const { selectedSourceChainId, selectedDestinationChainId } =
    getDialogSourceAndDestinationChains({
      sourceChainId: sourceChain.id,
      destinationChainId: destinationChain.id
    })

  const sourceNetworkSlug =
    selectedSourceChainId === ChainId.ArbitrumOne ? 'arbitrum' : 'nova'
  const destinationNetworkSlug =
    selectedDestinationChainId === ChainId.ArbitrumOne ? 'arbitrum' : 'nova'

  const bridgeDeepLink = `https://app.hop.exchange/#/send?sourceNetwork=${sourceNetworkSlug}&destNetwork=${destinationNetworkSlug}&token=${
    selectedToken?.symbol || ether.symbol
  }&amount=${amount}`

  // only enable Hop for now
  const fastBridgeList: FastBridgeInfo[] = [
    { name: FastBridgeNames.Hop, imageSrc: Hop, href: bridgeDeepLink }
  ]

  return (
    <Dialog
      {...props}
      onClose={() => props.onClose(false)}
      title={`Move funds from ${getNetworkName(
        selectedSourceChainId
      )} to ${getNetworkName(selectedDestinationChainId)}`}
      actionButtonProps={{ hidden: true }}
      className="max-w-[700px]"
    >
      <div className="flex flex-col pt-4">
        <Tab.Group>
          <Tab.List className="border-b border-gray-dark">
            <TabButton>Third party bridge</TabButton>
          </Tab.List>

          <Tab.Panel className="flex flex-col space-y-4 py-4">
            <div className="flex flex-col space-y-3">
              <p className="font-light">
                Use a third party bridge to transfer funds between Arbitrum One
                and Arbitrum Nova.
              </p>
            </div>

            <BridgesTable bridgeList={fastBridgeList} />
            <SecurityNotGuaranteed />
          </Tab.Panel>
        </Tab.Group>
      </div>
    </Dialog>
  )
}
