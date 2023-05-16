import { Loader } from '../../common/atoms/Loader'
import { EmptyTableRow } from './TransactionsTable'

export const TableBodyLoading = () => (
  <EmptyTableRow>
    <div className="flex flex-row items-center space-x-3">
      <Loader color="black" size="small" />
      <span className="text-sm font-medium">Loading transactions</span>
    </div>
  </EmptyTableRow>
)
