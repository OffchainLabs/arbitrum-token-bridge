import { useNetworks } from '../../hooks/useNetworks'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { Cog8ToothIcon } from '@heroicons/react/24/outline'
import { isValidLifiTransfer } from '../../pages/api/crosschain-transfers/utils'
import { DialogWrapper, useDialog2 } from '../common/Dialog2'
import { Button } from '../common/Button'
import { useAccountType } from '../../hooks/useAccountType'
import { useLatest } from 'react-use'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'

export function LifiSettingsButton() {
  const [dialogProps, openDialog] = useDialog2()
  const [networks] = useNetworks()
  const latestNetworks = useLatest(networks)
  const [selectedToken] = useSelectedToken()

  const {
    current: { isDepositMode }
  } = useLatest(useNetworksRelationship(latestNetworks.current))

  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()

  /**
   * Show settings if we're displaying lifi routes
   * or if it's an EOA (to display custom destination address input)
   */
  const showSettingsButton =
    isValidLifiTransfer({
      sourceChainId: networks.sourceChain.id,
      destinationChainId: networks.destinationChain.id,
      fromToken: isDepositMode
        ? selectedToken?.address
        : selectedToken?.l2Address
    }) ||
    (!isLoadingAccountType && !isSmartContractWallet)

  if (!showSettingsButton) {
    return null
  }

  return (
    <>
      <DialogWrapper {...dialogProps} />
      <Button
        variant="secondary"
        className="h-[40px] px-[10px] py-[10px] text-white"
        onClick={() => openDialog('settings')}
        aria-label="Open Settings"
      >
        <Cog8ToothIcon width={20} className="arb-hover text-white/80" />
      </Button>
    </>
  )
}
