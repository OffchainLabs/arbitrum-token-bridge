import { GET_HELP_LINK } from '../../constants'
import { ExternalLink } from '../common/ExternalLink'
import {
  ContentWrapper,
  HistoryLoader,
  LoadMoreButton
} from './TransactionHistoryTable'

export const EmptyTransactionHistory = ({
  loading,
  error,
  paused,
  resume,
  tab
}: {
  loading: boolean
  error: boolean
  paused: boolean
  resume: () => void
  tab: 'pending' | 'settled'
}) => {
  if (loading) {
    return (
      <ContentWrapper>
        <HistoryLoader />
      </ContentWrapper>
    )
  }
  if (error) {
    return (
      <ContentWrapper>
        <p>
          We seem to be having a difficult time loading your data, we&apos;re
          working hard to resolve it.
        </p>
        <p>Please give it a moment and then try refreshing the page.</p>
        <p className="mt-4">
          If the problem persists, please file a ticket{' '}
          <ExternalLink className="arb-hover underline" href={GET_HELP_LINK}>
            here
          </ExternalLink>
          .
        </p>
      </ContentWrapper>
    )
  }
  if (paused) {
    const isPendingTab = tab === 'pending'

    return (
      <ContentWrapper className="space-y-4">
        <p>
          There are no recent {isPendingTab ? 'pending' : 'settled'}{' '}
          transactions.
        </p>
        <LoadMoreButton onClick={resume} />
      </ContentWrapper>
    )
  }
  return <ContentWrapper>Looks like no transactions here yet.</ContentWrapper>
}
