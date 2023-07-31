import { MergedTransaction } from '../../../state/app/state'
import { CustomAddressTxExplorer } from './TransactionsTable'

export const TransactionsTableCustomAddressLabel = ({
  tx
}: {
  tx: MergedTransaction
}) => {
  return (
    <div className="absolute bottom-2 left-6 translate-x-0 rounded-md bg-black px-4 py-1 text-center text-sm text-white sm:left-[50%] sm:-translate-x-[50%]">
      <CustomAddressTxExplorer tx={tx} />
    </div>
  )
}
