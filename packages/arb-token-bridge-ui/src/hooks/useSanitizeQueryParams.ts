import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  decodeChainQueryParam,
  encodeChainQueryParam,
  DisabledFeaturesParam,
  ModeParamEnum,
  sanitizeQueryParams,
  encodeString,
  sanitizeTokenQueryParam,
  sanitizeTabQueryParam
} from '../util/queryParamUtils'
import { sanitizeExperimentalFeaturesQueryParam } from '../util'
import {
  isE2eTestingEnvironment,
  isProductionEnvironment
} from '../util/CommonUtils'
import { registerLocalNetwork } from '../util/networks'
import { addOrbitChainsToArbitrumSDK } from '../../../app/src/initialization'

interface SanitizedParams {
  sourceChainId: number
  destinationChainId: number
  experiments: string | undefined
  token: string | undefined
  tab: string
  disabledFeatures: string[] | undefined
  mode: string | undefined
}

function getDestinationWithSanitizedQueryParams(
  sanitized: SanitizedParams,
  query: Record<string, string | string[] | undefined>
) {
  const params = new URLSearchParams()

  for (const key in query) {
    // don't copy "sourceChain" and "destinationChain" query params
    if (
      key === 'sourceChain' ||
      key === 'destinationChain' ||
      key === 'experiments' ||
      key === 'token' ||
      key === 'tab' ||
      key === 'disabledFeatures' ||
      key === 'mode'
    ) {
      continue
    }

    const value = query[key]

    // copy everything else
    if (typeof value === 'string') {
      params.set(key, value)
    }
  }

  const encodedSource = encodeChainQueryParam(sanitized.sourceChainId)
  const encodedDestination = encodeChainQueryParam(sanitized.destinationChainId)
  const encodedExperiments = encodeString(sanitized.experiments)
  const encodedToken = encodeString(sanitized.token)
  const encodedTab = encodeString(sanitized.tab)
  const encodedMode = encodeString(sanitized.mode)

  if (encodedSource) {
    params.set('sourceChain', encodedSource)

    if (encodedDestination) {
      params.set('destinationChain', encodedDestination)
    }
  }

  if (encodedExperiments) {
    params.set('experiments', encodedExperiments)
  }

  if (encodedToken) {
    params.set('token', encodedToken)
  }

  if (encodedTab) {
    params.set('tab', encodedTab)
  }

  if (encodedMode) {
    params.set('mode', encodedMode)
  }

  if (sanitized.disabledFeatures) {
    for (const disabledFeature of sanitized.disabledFeatures) {
      params.append('disabledFeatures', disabledFeature)
    }
  }

  return `/?${params.toString()}`
}

export function useSanitizeQueryParams() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSanitizing, setIsSanitizing] = useState(false)

  useEffect(() => {
    async function sanitizeAndRedirect() {
      // First, ensure SDK is initialized with custom chains from localStorage
      addOrbitChainsToArbitrumSDK()

      // Convert URLSearchParams to object
      const params: Record<string, string | string[] | undefined> = {}
      searchParams.forEach((value, key) => {
        if (params[key]) {
          // Handle multiple values for the same key
          if (Array.isArray(params[key])) {
            ;(params[key] as string[]).push(value)
          } else {
            params[key] = [params[key] as string, value]
          }
        } else {
          params[key] = value
        }
      })

      const sourceChainId = decodeChainQueryParam(params.sourceChain)
      const destinationChainId = decodeChainQueryParam(params.destinationChain)
      const experiments =
        typeof params.experiments === 'string' ? params.experiments : undefined
      const token = typeof params.token === 'string' ? params.token : undefined
      const tab = typeof params.tab === 'string' ? params.tab : undefined
      const mode = typeof params.mode === 'string' ? params.mode : undefined
      const disabledFeatures =
        typeof params.disabledFeatures === 'string'
          ? [params.disabledFeatures]
          : params.disabledFeatures

      // If both sourceChain and destinationChain are not present, let the client sync with Metamask
      if (!sourceChainId && !destinationChainId) {
        return
      }

      // Register local network if needed
      if (!isProductionEnvironment || isE2eTestingEnvironment) {
        await registerLocalNetwork()
      }

      setIsSanitizing(true)

      try {
        const sanitizedChainIds = sanitizeQueryParams({
          sourceChainId,
          destinationChainId,
          disableTransfersToNonArbitrumChains: mode === ModeParamEnum.EMBED
        })

        const sanitized: SanitizedParams = {
          ...sanitizedChainIds,
          experiments: sanitizeExperimentalFeaturesQueryParam(experiments),
          token: sanitizeTokenQueryParam({
            token,
            sourceChainId: sanitizedChainIds.sourceChainId,
            destinationChainId: sanitizedChainIds.destinationChainId
          }),
          tab: sanitizeTabQueryParam(tab),
          disabledFeatures: DisabledFeaturesParam.decode(disabledFeatures),
          mode: mode ? mode : undefined
        }

        // if the sanitized query params are different from the initial values, redirect to the url with sanitized query params
        if (
          sourceChainId !== sanitized.sourceChainId ||
          destinationChainId !== sanitized.destinationChainId ||
          experiments !== sanitized.experiments ||
          token !== sanitized.token ||
          tab !== sanitized.tab ||
          (disabledFeatures?.length || 0) !==
            (sanitized.disabledFeatures?.length || 0) ||
          mode !== sanitized.mode
        ) {
          console.log(`[useClientSideSanitization] sanitizing query params`)
          console.log(
            `[useClientSideSanitization]     sourceChain=${sourceChainId}&destinationChain=${destinationChainId}&experiments=${experiments}&token=${token}&tab=${tab}&disabledFeatures=${disabledFeatures}&mode=${mode} (before)`
          )
          console.log(
            `[useClientSideSanitization]     sourceChain=${sanitized.sourceChainId}&destinationChain=${sanitized.destinationChainId}&experiments=${sanitized.experiments}&token=${sanitized.token}&tab=${sanitized.tab}&disabledFeatures=${sanitized.disabledFeatures}&mode=${sanitized.mode} (after)`
          )

          const newUrl = getDestinationWithSanitizedQueryParams(
            sanitized,
            params
          )
          router.replace(newUrl)
        }
      } finally {
        setIsSanitizing(false)
      }
    }

    sanitizeAndRedirect()
  }, [searchParams, router])

  return { isSanitizing }
}
