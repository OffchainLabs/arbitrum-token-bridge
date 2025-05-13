import { useCallback } from 'react'
import * as Sentry from '@sentry/react'
import { useNetworks } from './useNetworks'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { isDevelopment } from '../config/env'

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
   * Generates a Sentry fingerprint based on context and error details.
   */
  const _generateFingerprint = (
    error: unknown,
    category: ErrorCategory,
    label: string
  ): string[] => {
    const fingerprint = ['{{ default }}', category, label]
    const errorObj = error instanceof Error ? error : new Error(String(error))

    if (isEthersError(errorObj)) {
      // Prioritize specific codes/reasons for better grouping
      if (errorObj.code) {
        fingerprint.push(`code:${errorObj.code}`)
      } else if (errorObj.reason) {
        // Basic normalization: limit length, remove unique identifiers
        const normalizedReason = errorObj.reason
          .replace(/0x[a-fA-F0-9]{40}/g, 'ADDRESS') // Replace addresses
          .replace(/0x[a-fA-F0-9]+/g, 'HASH_OR_VALUE') // Replace other hex
          .replace(/\d+/g, 'NUMBER') // Replace numbers
          .substring(0, 80) // Limit length
        fingerprint.push(`reason:${normalizedReason}`)
      } else {
        // Fallback to name if no code/reason
        fingerprint.push(`name:${errorObj.name}`)
      }
    } else {
      // For generic errors, use the error name
      fingerprint.push(`name:${errorObj.name}`)
    }

    // Avoid adding the full error.message as it's often too unique

    return fingerprint
  }

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

      const fingerprint = _generateFingerprint(
        error,
        mergedData.category,
        params.label
      )
      scope.setFingerprint(fingerprint)

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
        if (isDevelopment) {
          console.log(`Ignored User Rejected Error: '${label}'`, {
            originalError: error
          })
        }
        return
      }

      // Skip logging for ignored categories
      if (IGNORED_ERROR_CATEGORIES.includes(category)) {
        if (isDevelopment) {
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
      if (isDevelopment) {
        console.error(
          `Handled Error: '${label}' [Category: ${category}, Level: ${level}]`,
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

/**
 * Interface for Ethers errors that might have specific properties
 */
interface EthersError extends Error {
  code?: string | number
  reason?: string
}

/**
 * Helper to check if an error appears to be an Ethers error
 */
function isEthersError(error: unknown): error is EthersError {
  return (
    error instanceof Error &&
    (typeof (error as EthersError).code !== 'undefined' ||
      typeof (error as EthersError).reason !== 'undefined')
  )
}
