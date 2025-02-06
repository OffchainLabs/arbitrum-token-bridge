import * as Sentry from '@sentry/react'

export function captureSentryErrorWithExtraData({
  error,
  originFunction,
  additionalData
}: {
  error: unknown
  originFunction: string
  additionalData?: Record<string, string>
}) {
  Sentry.withScope(scope => {
    // tags only allow primitive values
    scope.setTag('origin function', originFunction)

    if (additionalData) {
      scope.setTags(additionalData)
    }

    // Add query string to tags
    const query = new URLSearchParams(window.location.search)
    for (const [key, value] of query.entries()) {
      scope.setTag(`query.${key}`, value)
    }

    Sentry.captureException(error)
  })
}
