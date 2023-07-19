import { MergedTransaction } from '../../../state/app/state'
import { isCustomAddressTx } from '../../../state/app/utils'
import { CustomAddressTxExplorer } from './TransactionsTable'

export const TransactionsTableCustomAddressLabel = ({
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
