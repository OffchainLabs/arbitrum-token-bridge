import { EmptyTableRow } from './TransactionsTable'

export const TableBodyError = () => (
  <EmptyTableRow>
    <span className="text-sm font-medium text-brick-dark">
      Failed to load transactions
    </span>
  </EmptyTableRow>
)
