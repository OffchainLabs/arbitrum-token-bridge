import { useCallback, useMemo } from 'react'
import { twMerge } from 'tailwind-merge'
import { Chain } from 'wagmi'

import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { getBridgeUiConfigForChain } from '../../../util/bridgeUiConfig'
import { NetworkContainer, NetworkType } from './NetworkContainer'
import { EstimatedGas } from '../EstimatedGas'
import { NetworkSelectionContainer } from '../../common/NetworkSelectionContainer'
import { getNetworkName, isNetwork } from '../../../util/networks'
import { useActions, useAppState } from '../../../state'
import { useSelectedTokenBalances } from '../../../hooks/TransferPanel/useSelectedTokenBalances'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { TransferPanelMainInput } from '../TransferPanelMainInput'
import { ExternalLink } from '../../common/ExternalLink'
import {
  ETH_BALANCE_ARTICLE_LINK,
  USDC_LEARN_MORE_LINK
} from '../../../constants'
import {
  isTokenMainnetUSDC,
  isTokenSepoliaUSDC
} from '../../../util/TokenUtils'
import { useCustomFeeTokenBalances } from './hooks'
import { useTransferDisabledDialogStore } from '../TransferDisabledDialog'
import { TransferReadinessRichErrorMessage } from '../useTransferReadinessUtils'
import {
  AmountQueryParamEnum,
  useArbQueryParams
} from '../../../hooks/useArbQueryParams'
import { useTransferReadiness } from '../useTransferReadiness'
import { useGasSummary } from '../../../hooks/TransferPanel/useGasSummary'

function TokenDepositInfo() {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChain, childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const isTokenDeposit = isDepositMode && selectedToken
  if (!isTokenDeposit) {
    return null
  }

  return (
    <p className="text-xs font-light text-white">
      Make sure you have {nativeCurrency.symbol} in your{' '}
      {getNetworkName(childChain.id)} account, as you’ll need it to power
      transactions.
      <br />
      <ExternalLink
        href={ETH_BALANCE_ARTICLE_LINK}
        className="arb-hover underline"
      >
        Learn more
      </ExternalLink>
      .
    </p>
  )
}

function USDCSpecificInfo() {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChain } = useNetworksRelationship(networks)
  const { isArbitrumOne, isArbitrumSepolia } = isNetwork(childChain.id)

  const showUSDCSpecificInfo =
    (isTokenMainnetUSDC(selectedToken?.address) && isArbitrumOne) ||
    (isTokenSepoliaUSDC(selectedToken?.address) && isArbitrumSepolia)

  if (!showUSDCSpecificInfo) {
    return null
  }
  return (
    <p className="text-xs font-light text-white">
      Bridged USDC (USDC.e) will work but is different from Native USDC.{' '}
      <ExternalLink href={USDC_LEARN_MORE_LINK} className="arb-hover underline">
        Learn more
      </ExternalLink>
      .
    </p>
  )
}

function TokenNotTransferrableError() {
  const { openDialog: openTransferDisabledDialog } =
    useTransferDisabledDialogStore()
  return (
    <>
      <span>This token can&apos;t be bridged over.</span>{' '}
      <button
        className="arb-hover underline"
        onClick={openTransferDisabledDialog}
      >
        Learn more.
      </button>
    </>
  )
}

function GasEstimationFailureError() {
  return (
    <span>
      Gas estimation failed, join our{' '}
      <ExternalLink
        href="https://discord.com/invite/ZpZuw7p"
        className="underline"
      >
        Discord
      </ExternalLink>{' '}
      and reach out in #support for assistance.
    </span>
  )
}

function ErrorMessage(
  errorMessage: TransferReadinessRichErrorMessage | string | undefined
) {
  if (typeof errorMessage === 'undefined') {
    return undefined
  }

  if (typeof errorMessage === 'string') {
    return errorMessage
  }

  switch (errorMessage) {
    case TransferReadinessRichErrorMessage.GAS_ESTIMATION_FAILURE:
      return <GasEstimationFailureError />

    case TransferReadinessRichErrorMessage.TOKEN_WITHDRAW_ONLY:
    case TransferReadinessRichErrorMessage.TOKEN_TRANSFER_DISABLED:
      return <TokenNotTransferrableError />
  }
}

export function SourceNetworkContainer({
  setMaxAmount,
  loadingMaxAmount
}: {
  setMaxAmount: () => void
  loadingMaxAmount: boolean
}) {
  const actions = useActions()
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks, setNetworks] = useNetworks()
  const { childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const selectedTokenBalances = useSelectedTokenBalances()
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const [{ amount }, setQueryParams] = useArbQueryParams()
  const isMaxAmount = amount === AmountQueryParamEnum.MAX

  const gasSummary = useGasSummary()

  const { errorMessage } = useTransferReadiness({
    amount,
    gasSummary
  })

  const setAmount = useCallback(
    (newAmount: string) => {
      setQueryParams({ amount: newAmount })
    },
    [setQueryParams]
  )

  const customFeeTokenBalances = useCustomFeeTokenBalances()

  // TODO: refactor everything that relies on this to use source/destination instead of l1/l2
  const sourceChainLayer = isDepositMode ? 'l1' : 'l2'

  const buttonStyle = useMemo(
    () => ({
      backgroundColor: getBridgeUiConfigForChain(networks.sourceChain.id).color
        .primary
    }),
    [networks.sourceChain.id]
  )

  const onChange = useCallback(
    async (network: Chain) => {
      if (networks.destinationChain.id === network.id) {
        setNetworks({
          sourceChainId: networks.destinationChain.id,
          destinationChainId: networks.sourceChain.id
        })
        return
      }

      setNetworks({ sourceChainId: network.id })
      actions.app.setSelectedToken(null)
    },
    [
      actions.app,
      networks.destinationChain.id,
      networks.sourceChain.id,
      setNetworks
    ]
  )

  return (
    <NetworkContainer network={networks.sourceChain}>
      <NetworkContainer.NetworkListboxPlusBalancesContainer>
        <NetworkSelectionContainer
          buttonStyle={buttonStyle}
          buttonClassName={twMerge(
            'arb-hover flex w-max items-center space-x-1 rounded-full px-3 py-2 text-sm text-white outline-none md:text-2xl lg:px-4 lg:py-3'
          )}
          onChange={onChange}
        >
          From: {getNetworkName(networks.sourceChain.id)}
        </NetworkSelectionContainer>

        <NetworkContainer.BalancesContainer chainType="source">
          <NetworkContainer.TokenBalance
            on={NetworkType[sourceChainLayer]}
            balance={
              nativeCurrency.isCustom
                ? customFeeTokenBalances[sourceChainLayer]
                : selectedTokenBalances[sourceChainLayer]
            }
            forToken={nativeCurrency.isCustom ? nativeCurrency : selectedToken}
          />
          <NetworkContainer.ETHBalance chainType="source" />
        </NetworkContainer.BalancesContainer>
      </NetworkContainer.NetworkListboxPlusBalancesContainer>

      <div className="flex flex-col gap-1">
        <TransferPanelMainInput
          maxButtonProps={{
            loading: isMaxAmount || loadingMaxAmount,
            onClick: setMaxAmount
          }}
          errorMessage={ErrorMessage(errorMessage)}
          value={isMaxAmount ? '' : amount}
          onChange={e => {
            setAmount(e.target.value)
          }}
        />
        <USDCSpecificInfo />
        <TokenDepositInfo />
      </div>
      <EstimatedGas chainType="source" />
    </NetworkContainer>
  )
}
