import * as Sentry from '@sentry/react'

import { isUserRejectedError } from './isUserRejectedError'

/**
 * Categories for classifying errors
 */
export type ErrorCategory =
  | 'token_validation'
  | 'token_approval'
  | 'token_transfer'
  | 'contract_interaction'
  | 'contract_revert'
  | 'gas_estimation'
  | 'transaction_signing'
  | 'transaction_submission'
  | 'transaction_confirmation'
  | 'claim'
  | 'allowance_check'
  | 'network_request'
  | 'network_response'
  | 'bridge_validation'
  | 'bridge_operation'
  | 'user_input_validation'
  | 'user_interface'
  | 'user_rejection' // This category will be ignored by beforeSend if error matches isUserRejectedError
  | 'wallet_connection'
  | 'configuration_error'
  | 'system'
  | 'unknown'
  | 'unhandled_event' // For events not coming through useError or without specific category

/**
 * Interface for Ethers errors
 */
export interface EthersError extends Error {
  code?: string | number
  reason?: string
}

/**
 * Helper to check if an error appears to be an Ethers error
 */
export function isEthersError(error: unknown): error is EthersError {
  return (
    error instanceof Error &&
    (typeof (error as EthersError).code !== 'undefined' ||
      typeof (error as EthersError).reason !== 'undefined')
  )
}

/**
 * Generates a Sentry fingerprint.
 */
const generateAppFingerprint = (
  error: unknown,
  category: ErrorCategory,
  label: string
): string[] => {
  const fingerprint = ['{{ default }}', category, label]
  const errorObj = error instanceof Error ? error : new Error(String(error))

  if (isEthersError(errorObj)) {
    if (errorObj.code) {
      fingerprint.push(`code:${String(errorObj.code)}`)
    } else if (errorObj.reason) {
      const normalizedReason = errorObj.reason
        .replace(/0x[a-fA-F0-9]{64}/gi, 'TX_HASH')
        .replace(/0x[a-fA-F0-9]{40}/g, 'ADDRESS')
        .replace(/0x[a-fA-F0-9]+/g, 'HASH_OR_VALUE')
        .replace(/\d+/g, 'NUMBER')
        .substring(0, 80)
      fingerprint.push(`reason:${normalizedReason}`)
    } else {
      fingerprint.push(`name:${errorObj.name}`)
    }
  } else {
    fingerprint.push(`name:${errorObj.name}`)
  }
  return fingerprint.map(fp => fp.substring(0, 150))
}

/**
 * Initializes Sentry with global configurations.
 */
export function initializeSentry(dsn: string | undefined) {
  if (!dsn) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Sentry DSN not found, Sentry will not be initialized.')
    }
    return
  }

  Sentry.init({
    environment: process.env.NODE_ENV,
    dsn: dsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.025,
    maxValueLength: 0,
    ignoreErrors: [
      /eth_gasPrice/i,
      /eth_getBalance/i,
      /Attempt to connect to relay via/i,
      /Cannot redefine property/i,
      /^WebSocket connection failed for host: wss:\/\/relay.walletconnect.org$/i,
      'User rejected the request',
      'User denied transaction signature',
      'User rejected the transaction'
    ],
    beforeSend: (event: Sentry.ErrorEvent, hint: Sentry.EventHint) => {
      if (!hint.originalException) {
        return event
      }

      const exception = hint.originalException

      if (isUserRejectedError(exception)) {
        return null // Drop the event
      }

      const existingTags = event.tags || {}
      const category =
        (existingTags.error_category as ErrorCategory) || 'unhandled_event'
      const label =
        (existingTags.operation_label as string) ||
        (exception instanceof Error ? exception.name : 'unknown_operation')

      event.fingerprint = generateAppFingerprint(exception, category, label)

      return event
    }
  })
}

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
  if (process.env.NODE_ENV === 'development') {
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
