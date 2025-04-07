import { useCallback } from 'react'
import * as Sentry from '@sentry/react'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { useNetworks } from './useNetworks'

/**
 * Categories for classifying errors
 */
export type ErrorCategory =
  | 'token_validation'
  | 'token_approval'
  | 'token_transfer'
  | 'contract_interaction'
  | 'contract_validation'
  | 'claim'
  | 'allowance_check'
  | 'network_request'
  | 'network_response'
  | 'transaction_preparation'
  | 'transaction_execution'
  | 'bridge_validation'
  | 'bridge_operation'
  | 'user_input'
  | 'user_rejection'
  | 'system'
  | 'unknown'

/**
 * Parameters for the `handleError` function
 */
export interface HandleErrorParams {
  /** The original error object caught. */
  error: unknown
  /** A specific, unique identifier for the *operation* or context being attempted (e.g., 'cctp_approve_token', 'eth_deposit'). */
  label: string
  /** Optional: Caller-determined category for Sentry tagging. */
  category?: ErrorCategory | string
  /** Optional: Additional key-value data specific to this error instance for Sentry 'extra' context. */
  additionalData?: Record<string, any>
  /** Optional: Sentry severity level. Defaults to 'error' if not provided (except for user rejections). */
  level?: Sentry.SeverityLevel
}

/**
 * A unified hook acting as a Sentry logging facilitator.
 */
export function useError() {
  const [networks] = useNetworks()

  // Helper to gather common context data for Sentry
  const _getCommonContext = useCallback(() => {
    const sourceChainId = networks?.sourceChain?.id?.toString() ?? 'unknown'
    const destinationChainId =
      networks?.destinationChain?.id?.toString() ?? 'unknown_destination'
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
    mergedData: Record<string, any>,
    level: Sentry.SeverityLevel
  ) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry logging is disabled.')
      return
    }

    Sentry.withScope(scope => {
      scope.setLevel(level)

      // Set Tags (Caller provides most)
      scope.setTag('operation_label', params.label.substring(0, 200))
      if (params.category) {
        scope.setTag(
          'error_category',
          String(params.category).substring(0, 200)
        )
      }
      // Common context tags
      scope.setTag(
        'source_chain_id',
        String(mergedData.sourceChainId ?? 'unknown')
      )
      scope.setTag(
        'destination_chain_id',
        String(mergedData.destinationChainId ?? 'unknown')
      )
      if (mergedData.walletAddress !== 'disconnected') {
        scope.setTag('wallet_involved', 'true')
      }

      // Set Extra Data
      scope.setExtra('errorDetails', mergedData)
      scope.setExtra('errorMessage', (error as Error)?.message)
      scope.setExtra('errorName', (error as Error)?.name)

      // Set Fingerprint
      scope.setFingerprint([
        '{{ default }}',
        params.label,
        String(params.category || 'no_category'),
        String(mergedData.sourceChainId || 'unknown_chain')
      ])

      // Capture Error
      Sentry.captureException(error)
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
        category = 'unknown',
        additionalData = {},
        level: levelOverride = 'error'
      } = params

      // 1. handle user rejections
      const isRejection = isUserRejectedError(error)
      const level = levelOverride ?? (isRejection ? 'info' : 'error')

      // 2. merge context data
      const commonContext = _getCommonContext()
      const mergedData = {
        ...commonContext,
        ...additionalData,
        category,
        level,
        isUserRejection: isRejection
      }

      // 3. log to sentry
      _logToSentry(error, params, mergedData, level)

      // 4. log to console in development
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
