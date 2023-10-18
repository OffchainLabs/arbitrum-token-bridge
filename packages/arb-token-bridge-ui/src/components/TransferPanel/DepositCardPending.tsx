import { useMemo } from 'react'
import { getNetworkName } from '../../util/networks'
import { MergedTransaction } from '../../state/app/state'
import { DepositCountdown } from '../common/DepositCountdown'
import {
  DepositCardContainer,
  DepositL1TxStatus,
  DepositL2TxStatus
} from './DepositCard'
import { formatAmount } from '../../util/NumberUtils'
import { isCustomDestinationAddressTx } from '../../state/app/utils'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { CustomAddressTxExplorer } from '../TransactionHistory/TransactionsTable/TransactionsTable'
import { useChainLayers } from '../../hooks/useChainLayers'
import { useNetworks } from '../../hooks/useNetworks'

export function DepositCardPending({ tx }: { tx: MergedTransaction }) {
  const [{ fromProvider, toProvider }] = useNetworks()
  const { parentLayer, layer } = useChainLayers()
  const networkName = getNetworkName(toProvider.network.chainId)

  const tokenSymbol = useMemo(
    () =>
      sanitizeTokenSymbol(tx.asset, {
        erc20L1Address: tx.tokenAddress,
        chainId: fromProvider.network.chainId
      }),
    [fromProvider.network.chainId, tx.tokenAddress, tx.asset]
  )

  return (
    <DepositCardContainer tx={tx}>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div className="lg:-ml-8">
          {/* Heading */}
          <span className="ml-8 animate-pulse text-lg text-ocl-blue lg:ml-0 lg:text-2xl">
            Moving{' '}
            {formatAmount(Number(tx.value), {
              symbol: tokenSymbol
            })}{' '}
            to {networkName}
          </span>

          {/* Addresses */}
          <div className="h-2" />
          <div className="flex flex-col font-light">
            <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
              {parentLayer} transaction: <DepositL1TxStatus tx={tx} />
            </span>
            <span className="flex flex-nowrap gap-1 text-sm text-ocl-blue lg:text-base">
              {layer} transaction: <DepositL2TxStatus tx={tx} />
            </span>
            {isCustomDestinationAddressTx(tx) && (
              <span className="mt-2 flex flex-nowrap gap-1 text-sm text-gray-dark lg:text-base">
                <CustomAddressTxExplorer
                  tx={tx}
                  explorerClassName="arb-hover text-blue-link"
                />
              </span>
            )}
          </div>
        </div>

        <span className="absolute bottom-0 right-0 max-w-[100px] animate-pulse overflow-hidden text-ellipsis rounded-full bg-orange p-2 px-4 text-sm font-semibold text-ocl-blue lg:max-w-full lg:text-lg">
          <DepositCountdown tx={tx} />
        </span>
      </div>
    </DepositCardContainer>
  )
}
