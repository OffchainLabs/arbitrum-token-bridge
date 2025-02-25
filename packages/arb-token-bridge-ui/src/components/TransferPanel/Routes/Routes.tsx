import { PropsWithChildren } from 'react'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useIsCctpTransfer } from '../hooks/useIsCctpTransfer'
import { useIsOftV2Transfer } from '../hooks/useIsOftV2Transfer'
import { RouteProps } from './Route'
import { ArbitrumRoute } from './ArbitrumRoute'
import { CctpRoute } from './CctpRoute'
import { LayerZeroRoute } from './LayerZeroRoute'
import { useAmountBigNumber } from '../hooks/useAmountBigNumber'

function Wrapper({ children }: PropsWithChildren) {
  return <div className="mb-2 flex flex-col gap-2">{children}</div>
}

/**
 * Display CCTP routes:
 *  - Mainnet/Arb1, Sepolia/ArbSepolia
 *  - Native USDC on Arbitrum, USDC on L1
 * Display layerzero:
 *  - Mainnet/Arb1
 *  - USDT0 on Arb
 * Display canonical route for every route except:
 *  - Native USDC on Arb1
 *  - If layerzero is displayed
 *  - Arb1/ArbNova
 * Display no routes for:
 * - Arb1/ArbNova
 *
 */
export function Routes({
  onRouteSelected
}: Pick<RouteProps, 'onRouteSelected'>) {
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)
  const amount = useAmountBigNumber()

  const isCctpTransfer = useIsCctpTransfer()
  const isOftV2Transfer = useIsOftV2Transfer()

  if (amount.eq(0)) {
    return
  }

  if (isOftV2Transfer) {
    return (
      <Wrapper>
        <LayerZeroRoute onRouteSelected={onRouteSelected} />
      </Wrapper>
    )
  }

  if (isCctpTransfer) {
    if (isDepositMode) {
      return (
        <Wrapper>
          <CctpRoute onRouteSelected={onRouteSelected} />
          <ArbitrumRoute onRouteSelected={onRouteSelected} />
        </Wrapper>
      )
    }

    return (
      <Wrapper>
        <CctpRoute onRouteSelected={onRouteSelected} />
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <ArbitrumRoute onRouteSelected={onRouteSelected} />
    </Wrapper>
  )
}
