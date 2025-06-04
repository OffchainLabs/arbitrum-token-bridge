import { useCallback } from 'react'
import * as Sentry from '@sentry/react'
import { useNetworks } from './useNetworks'
import { isUserRejectedError } from '../util/isUserRejectedError'
import type { ErrorCategory, EthersError } from '../util/SentryUtils'
import { isEthersError } from '../util/SentryUtils'

/**
 * Categories of errors that should be automatically ignored for Sentry reporting
 */
const IGNORED_ERROR_CATEGORIES: ErrorCategory[] = ['user_rejection']

/**
 * Human-readable mappings for error categories
 */
const ERROR_CATEGORY_MESSAGES: Record<ErrorCategory, string> = {
  token_validation: 'Token validation failed',
  token_approval: 'Token approval failed',
  token_transfer: 'Token transfer failed',
  contract_interaction: 'Smart contract interaction failed',
  contract_revert: 'Transaction was reverted by the contract',
  gas_estimation: 'Gas estimation failed',
  transaction_signing: 'Transaction signing failed',
  transaction_submission: 'Transaction submission failed',
  transaction_confirmation: 'Transaction confirmation failed',
  claim: 'Claim operation failed',
  allowance_check: 'Token allowance check failed',
  network_request: 'Network request failed',
  network_response: 'Network response error',
  bridge_validation: 'Bridge validation failed',
  bridge_operation: 'Bridge operation failed',
  user_input_validation: 'Invalid input provided',
  user_interface: 'User interface error',
  user_rejection: 'Transaction was cancelled by user',
  wallet_connection: 'Wallet connection failed',
  configuration_error: 'Configuration error',
  system: 'System error occurred',
  unknown: 'An unknown error occurred',
  unhandled_event: 'An unexpected error occurred'
}

/**
 * Get human-readable error message for a given error category
 */
export function getErrorCategoryMessage(category: ErrorCategory): string {
  return ERROR_CATEGORY_MESSAGES[category] || ERROR_CATEGORY_MESSAGES.unknown
}

/**
 * Parameters for the `handleError` function
 */
export interface HandleErrorParams {
  /** The original error object caught. */
  error: unknown
  /** A specific, unique identifier for the *operation* or context being attempted (e.g., 'cctp_approve_token', 'eth_deposit'). */
  label: string
  /** Caller-determined category for Sentry tagging. */
  category: ErrorCategory
  /** Optional: Additional key-value data specific to this error instance for Sentry 'extra' context. */
  additionalData?: Record<string, any>
  /** Optional: Sentry severity level. Defaults to 'error' if not provided. */
  level?: Sentry.SeverityLevel
}

/**
 * Common data structure for error context
 */
interface ErrorContextData {
  category: ErrorCategory
  level: Sentry.SeverityLevel
  sourceChainId: string
  destinationChainId: string
  urlPath: string
  urlQuery: string
}

/**
 * A unified hook acting as a Sentry logging facilitator.
 */
export function useError() {
  const [networks] = useNetworks()

  // Helper to gather common context data for Sentry
  const _getCommonContext = useCallback(() => {
    const sourceChainId = networks.sourceChain.id.toString()
    const destinationChainId = networks.destinationChain.id.toString()
    const urlParams =
      typeof window !== 'undefined'
        ? Object.fromEntries(
            new URLSearchParams(window.location.search).entries()
          )
        : {}

    return {
      sourceChainId,
      destinationChainId,
      urlPath:
        typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      urlQuery: JSON.stringify(urlParams).substring(0, 200)
    }
  }, [networks])

  /**
   * Logs error details directly to Sentry based on caller-provided parameters.
   */
  const _logToSentry = (
    error: unknown,
    params: HandleErrorParams,
    mergedData: ErrorContextData,
    level: Sentry.SeverityLevel
  ) => {
    Sentry.withScope(scope => {
      scope.setLevel(level)

      const errorObj = error instanceof Error ? error : new Error(String(error))

      // Set Tags
      scope.setTag('operation_label', params.label.substring(0, 200))
      scope.setTag('error_category', mergedData.category)
      scope.setTag('source_chain_id', mergedData.sourceChainId)
      scope.setTag('destination_chain_id', mergedData.destinationChainId)
      scope.setTag('error_type', errorObj.name)
      if (isEthersError(errorObj) && errorObj.code) {
        scope.setTag('error_code', String(errorObj.code))
      }

      // Set Extra Data
      scope.setExtra('errorDetails', mergedData)
      scope.setExtra('errorMessage', errorObj.message)
      scope.setExtra('errorName', errorObj.name)
      scope.setExtra('errorStack', errorObj.stack)
      scope.setExtra('originalError', error)

      scope.setContext('Error Context', {
        ...mergedData,
        operationLabel: params.label
      })
      scope.setContext('Error Object', {
        name: errorObj.name,
        message: errorObj.message,
        code: (errorObj as EthersError).code,
        reason: (errorObj as EthersError).reason
      })

      Sentry.captureException(errorObj)
    })
  }

  /**
   * Main error handler: Logs to Sentry based on caller's input. Does NOT show toasts.
   */
  const handleError = useCallback(
    (params: HandleErrorParams): void => {
      const {
        error,
        label,
        category,
        additionalData = {},
        level: levelOverride
      } = params

      // Handle user rejections explicitly
      if (isUserRejectedError(error)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Ignored User Rejected Error: '${label}'`, {
            originalError: error
          })
        }
        return
      }

      // Skip logging for ignored categories
      if (IGNORED_ERROR_CATEGORIES.includes(category)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `Ignored Error by Category: '${label}' [Category: ${category}]`,
            {
              originalError: error
            }
          )
        }
        return
      }

      // Determine level
      const level = levelOverride ?? 'error'

      // merge context data
      const commonContext = _getCommonContext()
      const mergedData: ErrorContextData = {
        ...commonContext,
        ...additionalData,
        category,
        level
      }

      // log to sentry
      _logToSentry(error, params, mergedData, level)

      // log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `Handled Error: '${label}' [Category: ${category}, Level: ${level}]`,
          { originalError: error, contextData: mergedData }
        )
      }
    },
    [_getCommonContext]
  )

  return {
    handleError,
    getErrorCategoryMessage
  }
}
