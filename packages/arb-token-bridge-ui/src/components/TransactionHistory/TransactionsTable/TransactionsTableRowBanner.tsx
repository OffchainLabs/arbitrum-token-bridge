import { MergedTransaction } from '../../../state/app/state'
import { isCustomAddressTx, CustomAddressTxExplorer } from './TransactionsTable'

export const TransactionsTableRowBanner = ({
  tx
}: {
  tx: MergedTransaction
}) => {
  if (!isCustomAddressTx(tx)) {
    return null
  }

  return (
    <div className="absolute -bottom-[1px] left-0 rounded-tr-md bg-black px-4 py-1 text-center text-sm text-white">
      <CustomAddressTxExplorer tx={tx} />
    </div>
  )
}
