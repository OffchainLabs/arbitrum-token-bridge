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
import { useBalances, useCustomFeeTokenBalances } from './hooks'
import { useTransferDisabledDialogStore } from '../TransferDisabledDialog'
import { TransferReadinessRichErrorMessage } from '../useTransferReadinessUtils'
import {
  AmountQueryParamEnum,
  useArbQueryParams
} from '../../../hooks/useArbQueryParams'
import { useTransferReadiness } from '../useTransferReadiness'
import { useGasSummary } from '../../../hooks/TransferPanel/useGasSummary'

function ErrorMessage(
  errorMessage: TransferReadinessRichErrorMessage | string | undefined
) {
  const { openDialog: openTransferDisabledDialog } =
    useTransferDisabledDialogStore()

  if (typeof errorMessage === 'undefined') {
    return undefined
  }

  if (typeof errorMessage === 'string') {
    return errorMessage
  }

  switch (errorMessage) {
    case TransferReadinessRichErrorMessage.GAS_ESTIMATION_FAILURE:
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

    case TransferReadinessRichErrorMessage.TOKEN_WITHDRAW_ONLY:
    case TransferReadinessRichErrorMessage.TOKEN_TRANSFER_DISABLED:
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
  const { childChain, childChainProvider, isDepositMode } =
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

  const { ethL1Balance, ethL2Balance } = useBalances()
  const { isArbitrumOne, isArbitrumSepolia } = isNetwork(childChain.id)

  const showUSDCSpecificInfo =
    (isTokenMainnetUSDC(selectedToken?.address) && isArbitrumOne) ||
    (isTokenSepoliaUSDC(selectedToken?.address) && isArbitrumSepolia)

  const customFeeTokenBalances = useCustomFeeTokenBalances()

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
          <span className="max-w-[220px] truncate md:max-w-[250px]">
            From: {getNetworkName(networks.sourceChain.id)}
          </span>
        </NetworkSelectionContainer>
        <NetworkContainer.BalancesContainer>
          <NetworkContainer.TokenBalance
            on={isDepositMode ? NetworkType.l1 : NetworkType.l2}
            balance={
              isDepositMode
                ? selectedTokenBalances.l1
                : selectedTokenBalances.l2
            }
            forToken={selectedToken}
            prefix={selectedToken ? 'Balance: ' : ''}
          />
          {nativeCurrency.isCustom ? (
            <>
              <NetworkContainer.TokenBalance
                on={isDepositMode ? NetworkType.l1 : NetworkType.l2}
                balance={
                  isDepositMode
                    ? customFeeTokenBalances.l1
                    : customFeeTokenBalances.l2
                }
                forToken={nativeCurrency}
                prefix={selectedToken ? '' : 'Balance: '}
              />
              {/* Only show ETH balance on L1 */}
              {isDepositMode && (
                <NetworkContainer.ETHBalance balance={ethL1Balance} />
              )}
            </>
          ) : (
            <NetworkContainer.ETHBalance
              balance={isDepositMode ? ethL1Balance : ethL2Balance}
              prefix={selectedToken ? '' : 'Balance: '}
            />
          )}
        </NetworkContainer.BalancesContainer>
      </NetworkContainer.NetworkListboxPlusBalancesContainer>

      <div className="flex flex-col space-y-1">
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

        {showUSDCSpecificInfo && (
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
        )}
      </div>
      <EstimatedGas chainType="source" />
    </NetworkContainer>
  )
}
