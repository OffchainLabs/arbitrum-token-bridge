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

type MoveFundsButtonProps = Pick<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick'
> & {
  overrideText?: string
}
export function MoveFundsButton({
  onClick,
  overrideText
}: MoveFundsButtonProps) {
  const signer = useEthersSigner()
  const { layout } = useAppContextState()
  const { isTransferring } = layout

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
      {overrideText ||
        (isSmartContractWallet && isTransferring
          ? 'Sending request...'
          : `Move funds to ${getNetworkName(networks.destinationChain.id)}`)}
    </Button>
  )
}
