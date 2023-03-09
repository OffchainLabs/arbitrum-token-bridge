import { EmptyTableRow } from './TransactionsTable'

export const NoDataOverlay = () => (
  <EmptyTableRow>
    <span className="text-sm font-medium text-dark">
      Oops! Looks like nothing matched your search query.
    </span>
  </EmptyTableRow>
)
