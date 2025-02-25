import { BareFetcher, PublicConfiguration } from 'swr/dist/_internal'

export const onErrorRetry: <Data>() => PublicConfiguration<
  Data,
  any,
  BareFetcher<Data>
>['onErrorRetry'] = () => {
  return (error, key, config, revalidate, { retryCount }) => {
    // Never retry on 429.
    if (error.status === 429) return

    // Only retry up to maxErrorRetryCount times.
    if (retryCount >= (config.errorRetryCount || 2)) return

    // Retry after 3 seconds.
    setTimeout(() => revalidate({ retryCount }), config.errorRetryInterval)
  }
}
