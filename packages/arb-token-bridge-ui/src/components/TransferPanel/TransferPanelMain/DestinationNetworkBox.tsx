import { constants, utils } from 'ethers'

import { useNetworks } from '../../../hooks/useNetworks'
import { useDestinationAddressStore } from '../AdvancedSettings'
import {
  BalancesContainer,
  ETHBalance,
  NetworkButton,
  NetworkContainer,
  NetworkListboxPlusBalancesContainer
} from '../TransferPanelMain'
import { TokenBalance } from './TokenBalance'
import { Chain, useAccount } from 'wagmi'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { NetworkType } from './utils'
import { useActions, useAppState } from '../../../state'
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
import { useDialog } from '../../common/Dialog'
import { NetworkSelectionContainer } from '../../common/NetworkSelectionContainer'
import { useCallback } from 'react'

export function DestinationNetworkBox({
  customFeeTokenBalances,
  showUsdcSpecificInfo
}: {
  customFeeTokenBalances: Balances
  showUsdcSpecificInfo: boolean
}) {
  const { address: walletAddress } = useAccount()
  const [networks, setNetworks] = useNetworks()
  const { childChain, childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const { isArbitrumOne } = isNetwork(childChain.id)
  const {
    app: { selectedToken }
  } = useAppState()
  const actions = useActions()
  const { ethParentBalance, ethChildBalance, erc20ChildBalances } =
    useBalances()
  const selectedTokenBalances = useSelectedTokenBalances()
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const { destinationAddress } = useDestinationAddressStore()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress
  const [
    destinationNetworkSelectionDialogProps,
    openDestinationNetworkSelectionDialog
  ] = useDialog()

  const onChange = useCallback(
    async (network: Chain) => {
      setNetworks({
        sourceChainId: networks.sourceChain.id,
        destinationChainId: network.id
      })
      actions.app.setSelectedToken(null)
    },
    [actions.app, networks.sourceChain.id, setNetworks]
  )

  return (
    <>
      <NetworkContainer
        bgLogoHeight={58}
        network={networks.destinationChain}
        customAddress={destinationAddress}
      >
        <NetworkListboxPlusBalancesContainer>
          <NetworkButton
            type="destination"
            onClick={openDestinationNetworkSelectionDialog}
          />
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
                        <ETHBalance
                          balance={ethParentBalance}
                          on={NetworkType.parentChain}
                        />
                      )}
                    </>
                  ) : (
                    <ETHBalance
                      balance={
                        isDepositMode ? ethChildBalance : ethParentBalance
                      }
                      prefix={selectedToken ? '' : 'Balance: '}
                      on={
                        isDepositMode
                          ? NetworkType.childChain
                          : NetworkType.parentChain
                      }
                    />
                  )}
                </>
              )}
          </BalancesContainer>
        </NetworkListboxPlusBalancesContainer>
        <EstimatedGas chainType="destination" />
      </NetworkContainer>
      <NetworkSelectionContainer
        {...destinationNetworkSelectionDialogProps}
        type="destination"
        onChange={onChange}
      />
    </>
  )
}
