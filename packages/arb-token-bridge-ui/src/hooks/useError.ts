import { useCallback } from 'react'
import * as Sentry from '@sentry/react'
import { useNetworks } from './useNetworks'
import { isUserRejectedError } from '../util/isUserRejectedError'

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
  | 'user_rejection'
  | 'wallet_connection'
  | 'configuration_error'
  | 'system'
  | 'unknown'

/**
 * Categories of errors that should be automatically ignored for Sentry reporting
 */
const IGNORED_ERROR_CATEGORIES: ErrorCategory[] = ['user_rejection']

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
  [key: string]: any
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
      if (mergedData.walletAddress !== 'disconnected') {
        scope.setTag('wallet_involved', 'true')
      }

      // Set Extra Data
      scope.setExtra('errorDetails', mergedData)
      scope.setExtra('errorMessage', errorObj.message)
      scope.setExtra('errorName', errorObj.name)

      const fingerprint = [
        '{{ default }}',
        mergedData.category,
        params.label,
        errorObj.name
      ]

      scope.setFingerprint(fingerprint)
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

      // Skip logging for ignored categories
      if (
        IGNORED_ERROR_CATEGORIES.includes(category) ||
        isUserRejectedError(error)
      ) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Ignored Error: '${label}' [Category: ${category}]`, {
            originalError: error
          })
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
        console.log(
          `Handled Error '${label}' [Category: ${category} Level: ${level}]:`,
          { originalError: error, contextData: mergedData }
        )
      }
    },
    [_getCommonContext]
  )

  return {
    handleError
  }
}
