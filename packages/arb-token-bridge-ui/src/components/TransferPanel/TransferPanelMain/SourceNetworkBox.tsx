import { twMerge } from 'tailwind-merge'

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
import { NetworkListboxProps } from '../NetworkListbox'
import { getBridgeUiConfigForChain } from '../../../util/bridgeUiConfig'
import { AmountQueryParamEnum } from '../../../hooks/useArbQueryParams'

export function SourceNetworkBox({
  amount,
  loadingMaxAmount,
  setMaxAmount,
  errorMessageElement,
  customFeeTokenBalances,
  showUsdcSpecificInfo,
  sourceNetworkListboxProps
}: {
  amount: string
  loadingMaxAmount: boolean
  setMaxAmount: () => Promise<void>
  errorMessageElement: string | React.JSX.Element | undefined
  customFeeTokenBalances: Balances
  showUsdcSpecificInfo: boolean
  sourceNetworkListboxProps: Pick<NetworkListboxProps, 'onChange'>
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

  const isMaxAmount = amount === AmountQueryParamEnum.MAX

  const buttonStyle = {
    backgroundColor: getBridgeUiConfigForChain(networks.sourceChain.id).color
  }

  return (
    <NetworkContainer bgLogoHeight={138} network={networks.sourceChain}>
      <NetworkListboxPlusBalancesContainer>
        <NetworkSelectionContainer
          buttonStyle={buttonStyle}
          buttonClassName={twMerge(
            'arb-hover flex w-max items-center gap-1 md:gap-2 rounded px-3 py-2 text-sm text-white outline-none md:text-2xl'
          )}
          onChange={sourceNetworkListboxProps.onChange}
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
                isDepositMode ? NetworkType.parentChain : NetworkType.childChain
              }
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
          errorMessage={errorMessageElement}
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
