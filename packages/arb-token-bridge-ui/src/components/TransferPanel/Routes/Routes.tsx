import { PropsWithChildren, useEffect } from 'react'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useIsCctpTransfer } from '../hooks/useIsCctpTransfer'
import { useIsOftV2Transfer } from '../hooks/useIsOftV2Transfer'
import { ArbitrumCanonicalRoute } from './ArbitrumCanonicalRoute'
import { CctpRoute } from './CctpRoute'
import { OftV2Route } from './OftV2Route'
import React from 'react'
import { useRouteStore } from '../hooks/useRouteStore'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { useSelectedToken } from '../../../hooks/useSelectedToken'

function Wrapper({ children }: PropsWithChildren) {
  return <div className="mb-2 flex flex-col gap-2">{children}</div>
}

export function useDefaultSelectedRoute() {
  const [networks] = useNetworks()
  const [{ amount }] = useArbQueryParams()
  const { isDepositMode } = useNetworksRelationship(networks)
  const isCctpTransfer = useIsCctpTransfer()
  const isOftV2Transfer = useIsOftV2Transfer()
  const setSelectedRoute = useRouteStore(state => state.setSelectedRoute)
  const [selectedToken] = useSelectedToken()

  useEffect(() => {
    if (amount === '0') return

    if (isOftV2Transfer) {
      setSelectedRoute('oftV2')
      return
    }

    if (isCctpTransfer) {
      if (!isDepositMode) setSelectedRoute('cctp')
      return
    }

    setSelectedRoute('arbitrum')
  }, [
    amount,
    isOftV2Transfer,
    isCctpTransfer,
    isDepositMode,
    setSelectedRoute,
    selectedToken
  ])
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
export const Routes = React.memo(() => {
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)
  const [{ amount }] = useArbQueryParams()
  const isCctpTransfer = useIsCctpTransfer()
  const isOftV2Transfer = useIsOftV2Transfer()

  if (amount === '0') {
    return
  }

  if (isOftV2Transfer) {
    return (
      <Wrapper>
        <OftV2Route />
      </Wrapper>
    )
  }

  if (isCctpTransfer) {
    if (isDepositMode) {
      return (
        <Wrapper>
          <CctpRoute />
          <ArbitrumCanonicalRoute />
        </Wrapper>
      )
    }

    return (
      <Wrapper>
        <CctpRoute />
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <ArbitrumCanonicalRoute />
    </Wrapper>
  )
})

Routes.displayName = 'Routes'
