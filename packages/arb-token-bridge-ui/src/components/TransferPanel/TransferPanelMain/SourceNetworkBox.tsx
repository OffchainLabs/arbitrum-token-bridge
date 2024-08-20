import { useCallback, useEffect, useState } from 'react'
import { PlusCircleIcon } from '@heroicons/react/24/outline'

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
import {
  AmountQueryParamEnum,
  useArbQueryParams
} from '../../../hooks/useArbQueryParams'
import { useMaxAmount } from './useMaxAmount'
import { useSetInputAmount } from '../../../hooks/TransferPanel/useSetInputAmount'
import { useDialog } from '../../common/Dialog'
import { useTransferReadiness } from '../useTransferReadiness'
import { useIsBatchTransferSupported } from '../../../hooks/TransferPanel/useIsBatchTransferSupported'
import { Button } from '../../common/Button'

function Amount2ToggleButton({
  onClick
}: {
  onClick: React.ButtonHTMLAttributes<HTMLButtonElement>['onClick']
}) {
  return (
    <Button
      variant="secondary"
      className="border-white/30 shadow-2"
      onClick={onClick}
    >
      <div className="flex items-center space-x-1">
        <PlusCircleIcon width={18} />
        <span>Add ETH</span>
      </div>
    </Button>
  )
}

export function SourceNetworkBox({
  customFeeTokenBalances,
  showUsdcSpecificInfo
}: {
  customFeeTokenBalances: Balances
  showUsdcSpecificInfo: boolean
}) {
  const [isAmount2InputVisible, setIsAmount2InputVisible] = useState(false)

  const [networks] = useNetworks()
  const { childChain, childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const {
    app: { selectedToken }
  } = useAppState()
  const { ethParentBalance, ethChildBalance } = useBalances()
  const selectedTokenBalances = useSelectedTokenBalances()
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
            errorMessage={errorMessages?.inputAmount1}
            value={isMaxAmount ? '' : amount}
            onChange={e => setAmount(e.target.value)}
          />

          {isBatchTransferSupported && !isAmount2InputVisible && (
            <div className="flex justify-end">
              <Amount2ToggleButton
                onClick={() => setIsAmount2InputVisible(true)}
              />
            </div>
          )}

          {isBatchTransferSupported && isAmount2InputVisible && (
            <>
              <TransferPanelMainInput
                maxButtonOnClick={amount2MaxButtonOnClick}
                inputCollapseOnClick={() => setIsAmount2InputVisible(false)}
                errorMessage={errorMessages?.inputAmount2}
                value={amount2}
                onChange={e => setAmount2(e.target.value)}
                tokenButtonOptions={{
                  symbol: nativeCurrency.symbol,
                  disabled: true
                }}
              />
              <p className="mt-1 text-xs font-light text-white">
                You are able to move ETH in the same transaction, but you are
                not required to do so. This is the minimum ETH amount you will
                get, but you may get a bit more dependent on the gas usage.
              </p>
            </>
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
