import { ChangeEventHandler, useCallback, useEffect, useMemo } from 'react'
import { utils } from 'ethers'
import Image from 'next/image'
import { PlusCircleIcon } from '@heroicons/react/24/outline'
import { create } from 'zustand'

import { getNetworkName } from '../../../util/networks'
import {
  NetworkButton,
  NetworkSelectionContainer
} from '../../common/NetworkSelectionContainer'
import { NetworkContainer } from '../TransferPanelMain'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import {
  ETH_BALANCE_ARTICLE_LINK,
  USDC_LEARN_MORE_LINK
} from '../../../constants'
import { ExternalLink } from '../../common/ExternalLink'
import { EstimatedGas } from '../EstimatedGas'
import { TransferPanelMainInput } from '../TransferPanelMainInput'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
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
import { useSelectedTokenDecimals } from '../../../hooks/TransferPanel/useSelectedTokenDecimals'
import { getBridgeUiConfigForChain } from '../../../util/bridgeUiConfig'
import { useNativeCurrencyBalances } from './useNativeCurrencyBalances'
import { useIsCctpTransfer } from '../hooks/useIsCctpTransfer'
import { useSourceChainNativeCurrencyDecimals } from '../../../hooks/useSourceChainNativeCurrencyDecimals'
import { useIsSelectedTokenEther } from '../../../hooks/useIsSelectedTokenEther'
import { useBalances } from '../../../hooks/useBalances'
import { useIsOftV2Transfer } from '../hooks/useIsOftV2Transfer'

function Amount2ToggleButton({
  onClick
}: {
  onClick: React.ButtonHTMLAttributes<HTMLButtonElement>['onClick']
}) {
  const [networks] = useNetworks()
  const { childChainProvider } = useNetworksRelationship(networks)
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  return (
    <Button
      variant="secondary"
      className="border-white/30 shadow-2"
      onClick={onClick}
    >
      <div
        aria-label="Add native currency button"
        className="flex items-center space-x-1"
      >
        <PlusCircleIcon width={18} />
        <span>Add {nativeCurrency.symbol}</span>
      </div>
    </Button>
  )
}

export const useAmount2InputVisibility = create<{
  isAmount2InputVisible: boolean
  showAmount2Input: () => void
}>(set => ({
  isAmount2InputVisible: false,
  showAmount2Input: () => {
    set(() => ({
      isAmount2InputVisible: true
    }))
  }
}))

export function SourceNetworkBox() {
  const { isAmount2InputVisible, showAmount2Input } =
    useAmount2InputVisibility()

  const [networks] = useNetworks()
  const { childChain, childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const [selectedToken] = useSelectedToken()
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const [{ amount, amount2 }] = useArbQueryParams()
  const { setAmount, setAmount2 } = useSetInputAmount()
  const { maxAmount, maxAmount2 } = useMaxAmount()
  const [sourceNetworkSelectionDialogProps, openSourceNetworkSelectionDialog] =
    useDialog()
  const isBatchTransferSupported = useIsBatchTransferSupported()
  const decimals = useSelectedTokenDecimals()
  const { errorMessages } = useTransferReadiness()
  const { ethParentBalance } = useBalances()
  const nativeCurrencyBalances = useNativeCurrencyBalances()
  const nativeCurrencyDecimalsOnSourceChain =
    useSourceChainNativeCurrencyDecimals()
  const isSelectedTokenEther = useIsSelectedTokenEther()

  const isCctpTransfer = useIsCctpTransfer()

  const isOft = useIsOftV2Transfer()

  const {
    network: { logo: networkLogo }
  } = getBridgeUiConfigForChain(networks.sourceChain.id)

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

  useEffect(() => {
    if (isBatchTransferSupported && Number(amount2) > 0) {
      showAmount2Input()
    }
  }, [isBatchTransferSupported, amount2, showAmount2Input])

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

  const handleAmountChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    e => setAmount(e.target.value),
    [setAmount]
  )
  const handleAmount2Change: ChangeEventHandler<HTMLInputElement> = useCallback(
    e => {
      setAmount2(e.target.value)
    },
    [setAmount2]
  )

  const tokenButtonOptionsAmount2 = useMemo(
    () => ({
      symbol: nativeCurrency.symbol,
      disabled: true,
      balance: nativeCurrencyBalances.sourceBalance
        ? Number(
            utils.formatUnits(
              nativeCurrencyBalances.sourceBalance,
              nativeCurrencyDecimalsOnSourceChain
            )
          )
        : undefined,
      logoSrc: null
    }),
    [
      nativeCurrency.symbol,
      nativeCurrencyBalances.sourceBalance,
      nativeCurrencyDecimalsOnSourceChain
    ]
  )

  return (
    <>
      <NetworkContainer network={networks.sourceChain}>
        <div className="flex justify-between">
          <NetworkButton
            type="source"
            onClick={openSourceNetworkSelectionDialog}
          />
          <div className="relative h-[44px] w-[44px]">
            <Image
              src={networkLogo}
              alt={`${networks.sourceChain.name} logo`}
              layout={'fill'}
              objectFit={'contain'}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <TransferPanelMainInput
            maxButtonOnClick={maxButtonOnClick}
            errorMessage={errorMessages?.inputAmount1}
            value={isMaxAmount ? '' : amount}
            onChange={handleAmountChange}
            maxAmount={maxAmount}
            isMaxAmount={isMaxAmount}
            decimals={decimals}
            options={{
              balance:
                isSelectedTokenEther && isDepositMode && ethParentBalance
                  ? Number(utils.formatEther(ethParentBalance))
                  : undefined
            }}
          />

          {isBatchTransferSupported && !isAmount2InputVisible && (
            <div className="flex justify-end">
              <Amount2ToggleButton onClick={showAmount2Input} />
            </div>
          )}

          {isBatchTransferSupported && isAmount2InputVisible && (
            <>
              <TransferPanelMainInput
                maxButtonOnClick={amount2MaxButtonOnClick}
                errorMessage={errorMessages?.inputAmount2}
                value={amount2}
                onChange={handleAmount2Change}
                options={tokenButtonOptionsAmount2}
                maxAmount={maxAmount2}
                isMaxAmount={isMaxAmount2}
                decimals={nativeCurrency.decimals}
                aria-label="Amount2 input"
              />
              <p className="mt-1 text-xs font-light text-white">
                You can transfer {nativeCurrency.symbol} in the same transaction
                if you wish to.
              </p>
            </>
          )}

          {isCctpTransfer && (
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

          {isDepositMode && selectedToken && !isOft && (
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
