import Loader from 'react-loader-spinner'
import { EmptyTableRow } from './TransactionsTable'

export const TableBodyLoading = () => (
  <EmptyTableRow>
    <div className="flex flex-row items-center space-x-3">
      <Loader type="TailSpin" color="black" width={16} height={16} />
      <span className="text-sm font-medium">Loading transactions</span>
    </div>
  </EmptyTableRow>
)
