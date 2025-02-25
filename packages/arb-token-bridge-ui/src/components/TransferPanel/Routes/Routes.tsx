import { PropsWithChildren } from 'react'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useIsCctpTransfer } from '../hooks/useIsCctpTransfer'
import { useIsOftV2Transfer } from '../hooks/useIsOftV2Transfer'
import { RouteProps } from './Route'
import { ArbitrumRoute } from './ArbitrumRoute'
import { CctpRoute } from './CctpRoute'
import { OftV2Route } from './OftV2Route'
import { useAmountBigNumber } from '../hooks/useAmountBigNumber'
import { useRouteStore } from '../hooks/useRouteStore'
import React from 'react'

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
 * We memo the component, so calling `setSelectedRoute` doesn't rerender and cause infinite loop
 */
export const Routes = React.memo(
  ({ onRouteSelected }: Pick<RouteProps, 'onRouteSelected'>) => {
    const [networks] = useNetworks()
    const { isDepositMode } = useNetworksRelationship(networks)
    const amount = useAmountBigNumber()
    const setSelectedRoute = useRouteStore(state => state.setSelectedRoute)
    const isCctpTransfer = useIsCctpTransfer()
    const isOftV2Transfer = useIsOftV2Transfer()

    console.log(setSelectedRoute)
    if (amount.eq(0)) {
      return
    }

    if (isOftV2Transfer) {
      setSelectedRoute('oftV2')
      return (
        <Wrapper>
          <OftV2Route onRouteSelected={onRouteSelected} />
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

      setSelectedRoute('cctp')
      return (
        <Wrapper>
          <CctpRoute onRouteSelected={onRouteSelected} />
        </Wrapper>
      )
    }

    setSelectedRoute('arbitrum')
    return (
      <Wrapper>
        <ArbitrumRoute onRouteSelected={onRouteSelected} />
      </Wrapper>
    )
  }
)

Routes.displayName = 'Routes'
