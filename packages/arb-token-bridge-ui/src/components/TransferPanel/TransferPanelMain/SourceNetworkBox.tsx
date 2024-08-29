import { useCallback, useEffect } from 'react'
import { utils } from 'ethers'

import { getNetworkName } from '../../../util/networks'
import {
  NetworkButton,
  NetworkSelectionContainer
} from '../../common/NetworkSelectionContainer'
import { NetworkContainer } from '../TransferPanelMain'
import { useAppState } from '../../../state'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { Balances } from '../../../hooks/TransferPanel/useSelectedTokenBalances'
import {
  ETH_BALANCE_ARTICLE_LINK,
  USDC_LEARN_MORE_LINK
} from '../../../constants'
import { ExternalLink } from '../../common/ExternalLink'
import { EstimatedGas } from '../EstimatedGas'
import { TransferPanelMainInput } from '../TransferPanelMainInput'
import {
  AmountQueryParamEnum,
  useArbQueryParams
} from '../../../hooks/useArbQueryParams'
import { useMaxAmount } from './useMaxAmount'
import { useSetInputAmount } from '../../../hooks/TransferPanel/useSetInputAmount'
import { useDialog } from '../../common/Dialog'
import { useTransferReadiness } from '../useTransferReadiness'
import { useIsBatchTransferSupported } from '../../../hooks/TransferPanel/useIsBatchTransferSupported'
import { useBalances } from '../../../hooks/useBalances'

export function SourceNetworkBox({
  customFeeTokenBalances,
  showUsdcSpecificInfo
}: {
  customFeeTokenBalances: Balances
  showUsdcSpecificInfo: boolean
}) {
  const [networks] = useNetworks()
  const { childChain, childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const {
    app: { selectedToken }
  } = useAppState()
  const { ethParentBalance } = useBalances()
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const [{ amount, amount2 }] = useArbQueryParams()
  const { setAmount, setAmount2 } = useSetInputAmount()
  const { maxAmount, maxAmount2 } = useMaxAmount({
    customFeeTokenBalances
  })
  const [sourceNetworkSelectionDialogProps, openSourceNetworkSelectionDialog] =
    useDialog()
  const isBatchTransferSupported = useIsBatchTransferSupported()

  const { errorMessages } = useTransferReadiness()

  const isMaxAmount = amount === AmountQueryParamEnum.MAX
  const isMaxAmount2 = amount2 === AmountQueryParamEnum.MAX

  // covers MAX string from query params
  useEffect(() => {
    if (isMaxAmount && typeof maxAmount !== 'undefined') {
      setAmount(maxAmount)
    }
  }, [amount, maxAmount, isMaxAmount, setAmount])

  useEffect(() => {
    if (isMaxAmount2 && typeof maxAmount2 !== 'undefined') {
      setAmount2(maxAmount2)
    }
  }, [amount2, maxAmount2, isMaxAmount2, setAmount2])

  const maxButtonOnClick = useCallback(() => {
    if (typeof maxAmount !== 'undefined') {
      setAmount(maxAmount)
    }
  }, [maxAmount, setAmount])

  const amount2MaxButtonOnClick = useCallback(() => {
    if (typeof maxAmount2 !== 'undefined') {
      setAmount2(maxAmount2)
    }
  }, [maxAmount2, setAmount2])

  return (
    <>
      <NetworkContainer bgLogoHeight={138} network={networks.sourceChain}>
        <NetworkButton
          type="source"
          onClick={openSourceNetworkSelectionDialog}
        />

        <div className="flex flex-col gap-1">
          <TransferPanelMainInput
            maxButtonOnClick={maxButtonOnClick}
            errorMessage={errorMessages?.inputAmount1}
            value={isMaxAmount ? '' : amount}
            onChange={e => setAmount(e.target.value)}
            customFeeTokenBalances={customFeeTokenBalances}
          />

          {isBatchTransferSupported && (
            <TransferPanelMainInput
              maxButtonOnClick={amount2MaxButtonOnClick}
              errorMessage={errorMessages?.inputAmount2}
              value={amount2}
              onChange={e => setAmount2(e.target.value)}
              overrides={{
                symbol: nativeCurrency.symbol,
                tokenButtonDisabled: true,
                balance: ethParentBalance
                  ? Number(utils.formatEther(ethParentBalance))
                  : undefined
              }}
              customFeeTokenBalances={customFeeTokenBalances}
            />
          )}

          {showUsdcSpecificInfo && (
            <p className="mt-1 text-xs font-light text-white">
              Bridged USDC (USDC.e) will work but is different from Native USDC.{' '}
              <ExternalLink
                href={USDC_LEARN_MORE_LINK}
                className="arb-hover underline"
              >
                Learn more
              </ExternalLink>
              .
            </p>
          )}

          {isDepositMode && selectedToken && (
            <p className="mt-1 text-xs font-light text-white">
              Make sure you have {nativeCurrency.symbol} in your{' '}
              {getNetworkName(childChain.id)} account, as you’ll need it to
              power transactions.
              <br />
              <ExternalLink
                href={ETH_BALANCE_ARTICLE_LINK}
                className="arb-hover underline"
              >
                Learn more
              </ExternalLink>
              .
            </p>
          )}
        </div>
        <EstimatedGas chainType="source" />
      </NetworkContainer>
      <NetworkSelectionContainer
        {...sourceNetworkSelectionDialogProps}
        type="source"
      />
    </>
  )
}
