import { twMerge } from 'tailwind-merge'
import { Chain } from 'wagmi'
import { useCallback } from 'react'

import { getNetworkName } from '../../../util/networks'
import { NetworkSelectionContainer } from '../../common/NetworkSelectionContainer'
import {
  BalancesContainer,
  ETHBalance,
  NetworkContainer,
  NetworkListboxPlusBalancesContainer
} from '../TransferPanelMain'
import { TokenBalance } from './TokenBalance'
import { NetworkType } from './utils'
import { useActions } from '../../../state'
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
import { getBridgeUiConfigForChain } from '../../../util/bridgeUiConfig'
import { AmountQueryParamEnum } from '../../../hooks/useArbQueryParams'
import { TransferReadinessRichErrorMessage } from '../useTransferReadinessUtils'
import { useSelectedToken } from '../../../hooks/useSelectedToken'

export function SourceNetworkBox({
  amount,
  loadingMaxAmount,
  setMaxAmount,
  errorMessage,
  customFeeTokenBalances,
  showUsdcSpecificInfo
}: {
  amount: string
  loadingMaxAmount: boolean
  setMaxAmount: () => Promise<void>
  errorMessage: string | TransferReadinessRichErrorMessage | undefined
  customFeeTokenBalances: Balances
  showUsdcSpecificInfo: boolean
}) {
  const actions = useActions()
  const [networks, setNetworks] = useNetworks()
  const { childChain, childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const [selectedToken, setSelectedToken] = useSelectedToken()
  const { ethParentBalance, ethChildBalance } = useBalances()
  const selectedTokenBalances = useSelectedTokenBalances()
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const isMaxAmount = amount === AmountQueryParamEnum.MAX

  const buttonStyle = {
    backgroundColor: getBridgeUiConfigForChain(networks.sourceChain.id).color
  }

  const onChange = useCallback(
    async (network: Chain) => {
      if (networks.destinationChain.id === network.id) {
        setNetworks({
          sourceChainId: networks.destinationChain.id,
          destinationChainId: networks.sourceChain.id
        })
        return
      }

      // if changing sourceChainId, let the destinationId be the same, and let the `setNetworks` func decide whether it's a valid or invalid chain pair
      // this way, the destination doesn't reset to the default chain if the source chain is changed, and if both are valid
      setNetworks({
        sourceChainId: network.id,
        destinationChainId: networks.destinationChain.id
      })

      setSelectedToken(null)
    },
    [
      networks.destinationChain.id,
      networks.sourceChain.id,
      setNetworks,
      setSelectedToken
    ]
  )

  return (
    <NetworkContainer bgLogoHeight={138} network={networks.sourceChain}>
      <NetworkListboxPlusBalancesContainer>
        <NetworkSelectionContainer
          buttonStyle={buttonStyle}
          buttonClassName={twMerge(
            'arb-hover flex w-max items-center gap-1 md:gap-2 rounded px-3 py-2 text-sm text-white outline-none md:text-2xl'
          )}
          onChange={onChange}
        >
          <span className="max-w-[220px] truncate text-sm leading-[1.1] md:max-w-[250px] md:text-xl">
            From: {getNetworkName(networks.sourceChain.id)}
          </span>
        </NetworkSelectionContainer>
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
              {isDepositMode && <ETHBalance balance={ethParentBalance} />}
            </>
          ) : (
            <ETHBalance
              balance={isDepositMode ? ethParentBalance : ethChildBalance}
              prefix={selectedToken ? '' : 'Balance: '}
            />
          )}
        </BalancesContainer>
      </NetworkListboxPlusBalancesContainer>

      <div className="flex flex-col gap-1">
        <TransferPanelMainInput
          maxButtonProps={{
            loading: isMaxAmount || loadingMaxAmount,
            onClick: setMaxAmount
          }}
          errorMessage={errorMessage}
          value={isMaxAmount ? '' : amount}
        />

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
