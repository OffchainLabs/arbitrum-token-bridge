import { constants, utils } from 'ethers'

import { useNetworks } from '../../../hooks/useNetworks'
import { useDestinationAddressStore } from '../AdvancedSettings'
import { NetworkListbox, NetworkListboxProps } from '../NetworkListbox'
import {
  BalancesContainer,
  ETHBalance,
  NetworkContainer,
  NetworkListboxPlusBalancesContainer
} from '../TransferPanelMain'
import { TokenBalance } from './TokenBalance'
import { useAccount } from 'wagmi'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { NetworkType } from './utils'
import { useAppState } from '../../../state'
import { sanitizeTokenSymbol } from '../../../util/TokenUtils'
import { useBalances } from '../../../hooks/useBalances'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { isNetwork } from '../../../util/networks'
import { EstimatedGas } from '../EstimatedGas'
import {
  Balances,
  useSelectedTokenBalances
} from '../../../hooks/TransferPanel/useSelectedTokenBalances'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'

export function DestinationNetworkBox({
  customFeeTokenBalances,
  showUsdcSpecificInfo,
  destinationNetworkListboxProps
}: {
  customFeeTokenBalances: Balances
  showUsdcSpecificInfo: boolean
  destinationNetworkListboxProps: Omit<NetworkListboxProps, 'label'>
}) {
  const { address: walletAddress } = useAccount()
  const [networks] = useNetworks()
  const { childChain, childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const { isArbitrumOne } = isNetwork(childChain.id)
  const {
    app: { selectedToken }
  } = useAppState()
  const { ethParentBalance, ethChildBalance, erc20ChildBalances } =
    useBalances()
  const selectedTokenBalances = useSelectedTokenBalances()
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const { destinationAddress } = useDestinationAddressStore()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress

  return (
    <NetworkContainer
      bgLogoHeight={58}
      network={networks.destinationChain}
      customAddress={destinationAddress}
    >
      <NetworkListboxPlusBalancesContainer>
        <NetworkListbox label="To:" {...destinationNetworkListboxProps} />
        <BalancesContainer>
          {destinationAddressOrWalletAddress &&
            utils.isAddress(destinationAddressOrWalletAddress) && (
              <>
                <TokenBalance
                  balance={
                    isDepositMode
                      ? selectedTokenBalances.childBalance
                      : selectedTokenBalances.parentBalance
                  }
                  on={
                    isDepositMode
                      ? NetworkType.childChain
                      : NetworkType.parentChain
                  }
                  forToken={selectedToken}
                  prefix={selectedToken ? 'Balance: ' : ''}
                  tokenSymbolOverride={
                    // we need to send the proper, sanitized token-name to the component
                    selectedToken?.symbol
                      ? sanitizeTokenSymbol(selectedToken?.symbol, {
                          chainId: networks.destinationChain.id,
                          erc20L1Address: selectedToken?.address
                        })
                      : undefined
                  }
                />
                {/* In deposit mode, when user selected USDC on mainnet,
              the UI shows the Arb One balance of both USDC.e and native USDC */}
                {isDepositMode && showUsdcSpecificInfo && (
                  <TokenBalance
                    balance={
                      (isArbitrumOne
                        ? erc20ChildBalances?.[CommonAddress.ArbitrumOne.USDC]
                        : erc20ChildBalances?.[
                            CommonAddress.ArbitrumSepolia.USDC
                          ]) ?? constants.Zero
                    }
                    on={NetworkType.childChain}
                    forToken={
                      selectedToken
                        ? { ...selectedToken, symbol: 'USDC' }
                        : null
                    }
                    tokenSymbolOverride="USDC"
                  />
                )}
                {nativeCurrency.isCustom ? (
                  <>
                    <TokenBalance
                      on={
                        isDepositMode
                          ? NetworkType.childChain
                          : NetworkType.parentChain
                      }
                      balance={
                        isDepositMode
                          ? customFeeTokenBalances.childBalance
                          : customFeeTokenBalances.parentBalance
                      }
                      forToken={nativeCurrency}
                      prefix={selectedToken ? '' : 'Balance: '}
                    />
                    {!isDepositMode && (
                      <ETHBalance balance={ethParentBalance} />
                    )}
                  </>
                ) : (
                  <ETHBalance
                    balance={isDepositMode ? ethChildBalance : ethParentBalance}
                    prefix={selectedToken ? '' : 'Balance: '}
                  />
                )}
              </>
            )}
        </BalancesContainer>
      </NetworkListboxPlusBalancesContainer>
      <EstimatedGas chainType="destination" />
    </NetworkContainer>
  )
}
