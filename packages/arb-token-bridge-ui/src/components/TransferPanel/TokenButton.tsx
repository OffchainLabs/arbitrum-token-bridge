import { useMemo } from 'react'
import { utils } from 'ethers'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { TokenLogo } from './TokenLogo'
import { Loader } from '../common/atoms/Loader'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useTokenLists } from '../../hooks/useTokenLists'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { Button } from '../common/Button'
import { DialogWrapper, useDialog2 } from '../common/Dialog2'

export type TokenButtonOptions = {
  symbol?: string
  logoSrc?: string | null
  disabled?: boolean
}

export function TokenButton({
  options
}: {
  options?: TokenButtonOptions
}): JSX.Element {
  const [selectedToken] = useSelectedToken()
  const disabled = options?.disabled ?? false

  const [dialogProps, openDialog] = useDialog2()

  const [networks] = useNetworks()
  const { childChain, childChainProvider } = useNetworksRelationship(networks)
  const { isLoading: isLoadingTokenLists } = useTokenLists(childChain.id)
  const [{ token: tokenFromSearchParams }] = useArbQueryParams()

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const tokenSymbol = useMemo(() => {
    if (typeof options?.symbol !== 'undefined') {
      return options.symbol
    }

    if (!selectedToken) {
      return nativeCurrency.symbol
    }

    return sanitizeTokenSymbol(selectedToken.symbol, {
      erc20L1Address: selectedToken.address,
      chainId: networks.sourceChain.id
    })
  }, [selectedToken, networks.sourceChain.id, nativeCurrency.symbol, options])

  const isLoadingToken = useMemo(() => {
    // don't show loader if native currency is selected
    if (!tokenFromSearchParams) {
      return false
    }
    if (!utils.isAddress(tokenFromSearchParams)) {
      return false
    }
    return isLoadingTokenLists
  }, [tokenFromSearchParams, isLoadingTokenLists])

  return (
    <>
      <DialogWrapper {...dialogProps} />

      <Button
        variant="secondary"
        className="px-[10px] py-[5px]"
        aria-label="Select Token"
        onClick={() => openDialog('token_selection')}
        disabled={disabled}
      >
        <div className="flex flex-nowrap items-center gap-1 text-sm leading-[1.1]">
          {isLoadingToken ? (
            <Loader size="small" color="white" />
          ) : (
            <>
              <TokenLogo srcOverride={options?.logoSrc} />
              <span className="font-light">{tokenSymbol}</span>
              {!disabled && <ChevronDownIcon width={12} />}
            </>
          )}
        </div>
      </Button>
    </>
  )
}
