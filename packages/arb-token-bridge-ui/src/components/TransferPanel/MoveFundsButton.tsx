import { twMerge } from 'tailwind-merge'

import { useNetworks } from '../../hooks/useNetworks'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'
import { useAppContextState } from '../App/AppContext'
import { Button } from '../common/Button'
import { useTransferReadiness } from './useTransferReadiness'
import { useAccountType } from '../../hooks/useAccountType'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { getNetworkName } from '../../util/networks'
import { useEthersSigner } from '../../util/wagmi/useEthersSigner'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useRouteStore } from './hooks/useRouteStore'

type MoveFundsButtonProps = Pick<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick'
>
export function MoveFundsButton({ onClick }: MoveFundsButtonProps) {
  const signer = useEthersSigner()
  const { layout } = useAppContextState()
  const { isTransferring } = layout
  const [{ amount, theme }] = useArbQueryParams()
  const selectedRoute = useRouteStore(state => state.selectedRoute)

  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)
  const { color: destinationChainUIcolor } = getBridgeUiConfigForChain(
    networks.destinationChain.id
  )
  const { accountType } = useAccountType()
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
        borderColor: theme.primaryCtaColor ?? destinationChainUIcolor,
        backgroundColor: `${theme.primaryCtaColor ?? destinationChainUIcolor}66`
      }}
      className={twMerge(
        'w-full border bg-primary-cta py-3 text-lg',
        'disabled:!border-white/10 disabled:!bg-white/10',
        'lg:text-2xl'
      )}
    >
      {!selectedRoute && Number(amount) > 0
        ? 'Select route'
        : accountType === 'smart-contract-wallet' && isTransferring
        ? 'Sending request...'
        : `Move funds to ${getNetworkName(networks.destinationChain.id)}`}
    </Button>
  )
}
