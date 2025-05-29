import { twMerge } from 'tailwind-merge'

import { useAccountType } from '../../hooks/useAccountType'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'
import { getNetworkName } from '../../util/networks'
import { useEthersSigner } from '../../util/wagmi/useEthersSigner'
import { useAppContextState } from '../App/AppContext'
import { Button } from '../common/Button'
import { useRouteStore } from './hooks/useRouteStore'
import { useTransferReadiness } from './useTransferReadiness'

type MoveFundsButtonProps = Pick<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick'
>
export function MoveFundsButton({ onClick }: MoveFundsButtonProps) {
  const signer = useEthersSigner()
  const { layout } = useAppContextState()
  const { isTransferring } = layout
  const [{ amount }] = useArbQueryParams()
  const selectedRoute = useRouteStore(state => state.selectedRoute)

  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)
  const { color: destinationChainUIcolor } = getBridgeUiConfigForChain(
    networks.destinationChain.id
  )
  const { isSmartContractWallet } = useAccountType()
  const { transferReady } = useTransferReadiness()
  const isDisabled =
    !signer ||
    (isDepositMode ? !transferReady.deposit : !transferReady.withdrawal)

  return (
    <Button
      variant="primary"
      loading={isTransferring}
      disabled={isDisabled}
      onClick={onClick}
      style={{
        borderColor: destinationChainUIcolor,
        backgroundColor: `${destinationChainUIcolor}66`
      }}
      className={twMerge(
        'w-full border py-3 text-lg',
        'disabled:!border-white/10 disabled:!bg-white/10',
        'lg:text-2xl'
      )}
    >
      {!selectedRoute && Number(amount) > 0
        ? 'Select route'
        : isSmartContractWallet && isTransferring
        ? 'Sending request...'
        : `Move funds to ${getNetworkName(networks.destinationChain.id)}`}
    </Button>
  )
}
