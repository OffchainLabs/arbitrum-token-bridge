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
  // tags only allow primitive values
  Sentry.getCurrentScope().setTag('origin function', originFunction)

  if (additionalData) {
    Sentry.getCurrentScope().setTags(additionalData)
  }
  Sentry.captureException(error)
}
