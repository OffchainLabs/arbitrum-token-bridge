import * as Sentry from '@sentry/react'
import { isDevelopment } from '../config/env'

/**
 * @deprecated Use the useError().handleError() hook instead
 * This function is kept for backward compatibility but should not be used in new code.
 * TODO: Replace all usages of this function with useError().handleError() and remove this function completely
 */
export function captureSentryErrorWithExtraData({
  error,
  originFunction,
  additionalData
}: {
  error: unknown
  originFunction: string
  additionalData?: Record<string, string>
}) {
  // Add a console warning in development
  if (isDevelopment) {
    console.warn(
      'captureSentryErrorWithExtraData is deprecated. Use the useError().handleError() hook instead.'
    )
  }

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
