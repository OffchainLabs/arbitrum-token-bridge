import { useCallback, useEffect } from 'react'

import { isTeleport } from '@/token-bridge-sdk/teleport'
import { getNetworkName } from '../../../util/networks'
import {
  NetworkButton,
  NetworkSelectionContainer
} from '../../common/NetworkSelectionContainer'
import {
  BalancesContainer,
  ETHBalance,
  NetworkContainer,
  NetworkListboxPlusBalancesContainer
} from '../TransferPanelMain'
import { TokenBalance } from './TokenBalance'
import { NetworkType } from './utils'
import { useAppState } from '../../../state'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import {
  Balances,
  useSelectedTokenBalances
} from '../../../hooks/TransferPanel/useSelectedTokenBalances'
import { useBalances } from '../../../hooks/useBalances'
import {
  ETH_BALANCE_ARTICLE_LINK,
  USDC_LEARN_MORE_LINK
} from '../../../constants'
import { ExternalLink } from '../../common/ExternalLink'
import { EstimatedGas } from '../EstimatedGas'
import { TransferPanelMainInput } from '../TransferPanelMainInput'
import { AmountQueryParamEnum } from '../../../hooks/useArbQueryParams'
import { TransferReadinessRichErrorMessage } from '../useTransferReadinessUtils'
import { useMaxAmount } from './useMaxAmount'
import { useSetInputAmount } from '../../../hooks/TransferPanel/useSetInputAmount'
import { FeatureFlags, isExperimentalFeatureEnabled } from '../../../util'
import { useDialog } from '../../common/Dialog'

export function SourceNetworkBox({
  amount,
  errorMessage,
  customFeeTokenBalances,
  showUsdcSpecificInfo
}: {
  amount: string
  errorMessage: string | TransferReadinessRichErrorMessage | undefined
  customFeeTokenBalances: Balances
  showUsdcSpecificInfo: boolean
}) {
  const [networks] = useNetworks()
  const { childChain, childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const {
    app: { selectedToken }
  } = useAppState()
  const { ethParentBalance, ethChildBalance } = useBalances()
  const selectedTokenBalances = useSelectedTokenBalances()
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const setAmount = useSetInputAmount()
  const { maxAmount } = useMaxAmount({
    customFeeTokenBalances
  })
  const [sourceNetworkSelectionDialogProps, openSourceNetworkSelectionDialog] =
    useDialog()

  const isMaxAmount = amount === AmountQueryParamEnum.MAX

  // whenever the user changes the `amount` input, it should update the amount in browser query params as well
  useEffect(() => {
    if (isMaxAmount && typeof maxAmount !== 'undefined') {
      setAmount(maxAmount)
    } else {
      setAmount(amount)
    }
  }, [amount, maxAmount, isMaxAmount, setAmount])

  const maxButtonOnClick = useCallback(() => {
    if (typeof maxAmount !== 'undefined') {
      setAmount(maxAmount)
    }
  }, [maxAmount, setAmount])

  return (
    <>
      <NetworkContainer bgLogoHeight={138} network={networks.sourceChain}>
        <NetworkListboxPlusBalancesContainer>
          <NetworkButton
            type="source"
            onClick={openSourceNetworkSelectionDialog}
          />
          <BalancesContainer>
            <TokenBalance
              on={
                isDepositMode ? NetworkType.parentChain : NetworkType.childChain
              }
              balance={
                isDepositMode
                  ? selectedTokenBalances.parentBalance
                  : selectedTokenBalances.childBalance
              }
              forToken={selectedToken}
              prefix={selectedToken ? 'Balance: ' : ''}
            />
            {nativeCurrency.isCustom ? (
              <>
                <TokenBalance
                  on={
                    isDepositMode
                      ? NetworkType.parentChain
                      : NetworkType.childChain
                  }
                  balance={
                    isDepositMode
                      ? customFeeTokenBalances.parentBalance
                      : customFeeTokenBalances.childBalance
                  }
                  forToken={nativeCurrency}
                  prefix={selectedToken ? '' : 'Balance: '}
                />
                {/* Only show ETH balance on parent chain */}
                {isDepositMode && (
                  <ETHBalance
                    balance={ethParentBalance}
                    on={NetworkType.parentChain}
                  />
                )}
              </>
            ) : (
              <ETHBalance
                balance={isDepositMode ? ethParentBalance : ethChildBalance}
                prefix={selectedToken ? '' : 'Balance: '}
                on={
                  isDepositMode
                    ? NetworkType.parentChain
                    : NetworkType.childChain
                }
              />
            )}
          </BalancesContainer>
        </NetworkListboxPlusBalancesContainer>

        <div className="flex flex-col gap-1">
          <TransferPanelMainInput
            maxButtonOnClick={maxButtonOnClick}
            errorMessage={errorMessage}
            value={isMaxAmount ? '' : amount}
          />

          {isExperimentalFeatureEnabled(FeatureFlags.Batch) &&
            // TODO: teleport is disabled for now but it needs to be looked into more to check whether it is or can be supported
            !isTeleport({
              sourceChainId: networks.sourceChain.id,
              destinationChainId: networks.destinationChain.id
            }) &&
            selectedToken && (
              <TransferPanelMainInput
                // eslint-disable-next-line
                maxButtonOnClick={() => {}}
                errorMessage={undefined}
                value={''}
                // eslint-disable-next-line
                onChange={() => {}}
                tokenButtonOptions={{
                  symbol: nativeCurrency.symbol,
                  disabled: true
                }}
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
