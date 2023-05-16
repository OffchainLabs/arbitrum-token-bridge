import { EmptyTableRow } from './TransactionsTable'

export const TableBodyError = () => (
  <EmptyTableRow>
    <span className="text-sm font-medium text-brick-dark">
      Failed to load transactions, please try refreshing the page
    </span>
  </EmptyTableRow>
)
