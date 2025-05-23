import { GET_HELP_LINK } from '../../constants'
import { ExternalLink } from '../common/ExternalLink'
import { useTransactionHistoryAddressStore } from './TransactionHistorySearchBar'
import {
  ContentWrapper,
  HistoryLoader,
  LoadMoreButton
} from './TransactionHistoryTable'

export const EmptyTransactionHistory = ({
  loading,
  isError,
  paused,
  resume,
  tabType
}: {
  loading: boolean
  isError: boolean
  paused: boolean
  resume: () => void
  tabType: 'pending' | 'settled'
}) => {
  const txHistoryAddress = useTransactionHistoryAddressStore(
    state => state.sanitizedAddress
  )

  if (typeof txHistoryAddress === 'undefined') {
    return (
      <ContentWrapper>
        <p>
          Please connect your wallet or search for a wallet address to see
          transactions.
        </p>
      </ContentWrapper>
    )
  }

  if (loading) {
    return (
      <ContentWrapper>
        <HistoryLoader />
      </ContentWrapper>
    )
  }
  if (isError) {
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
    return (
      <ContentWrapper className="space-y-4">
        <p>There are no recent {tabType} transactions.</p>
        <LoadMoreButton onClick={resume} />
      </ContentWrapper>
    )
  }
  return (
    <ContentWrapper className="lg:text-center">
      No {tabType} transactions.
    </ContentWrapper>
  )
}
