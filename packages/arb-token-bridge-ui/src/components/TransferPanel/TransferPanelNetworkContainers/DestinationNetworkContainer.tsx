import { constants, utils } from 'ethers'

import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useDestinationAddressStore } from '../AdvancedSettings'
import { EstimatedGas } from '../EstimatedGas'
import { NetworkListbox, NetworkListboxProps } from '../NetworkListbox'
import { NetworkContainer, NetworkType } from './NetworkContainer'
import { useSelectedTokenBalances } from '../../../hooks/TransferPanel/useSelectedTokenBalances'
import { useActions, useAppState } from '../../../state'
import { useAccount } from 'wagmi'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import {
  ChainId,
  getDestinationChainIds,
  isNetwork
} from '../../../util/networks'
import {
  isTokenMainnetUSDC,
  isTokenSepoliaUSDC
} from '../../../util/TokenUtils'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useBalances, useCustomFeeTokenBalances } from './hooks'
import { getWagmiChain } from '../../../util/wagmi/getWagmiChain'
import { useMemo } from 'react'
import { useAccountType } from '../../../hooks/useAccountType'

export function DestinationNetworkContainer({
  onChange
}: {
  onChange: (networkId: number) => void
}) {
  const actions = useActions()
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks, setNetworks] = useNetworks()
  const { childChain, childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const { address: walletAddress } = useAccount()
  const { destinationAddress } = useDestinationAddressStore()
  const selectedTokenBalances = useSelectedTokenBalances()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress
  const { isArbitrumOne, isArbitrumSepolia } = isNetwork(childChain.id)
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()

  const { ethL1Balance, ethL2Balance, erc20L2Balances } = useBalances()

  const customFeeTokenBalances = useCustomFeeTokenBalances()

  const showUSDCSpecificInfo =
    (isTokenMainnetUSDC(selectedToken?.address) && isArbitrumOne) ||
    (isTokenSepoliaUSDC(selectedToken?.address) && isArbitrumSepolia)

  type NetworkListboxesProps = {
    to: Omit<NetworkListboxProps, 'label'>
  }

  const networkListboxProps: NetworkListboxesProps = useMemo(() => {
    function getDestinationChains() {
      const destinationChainIds = getDestinationChainIds(
        networks.sourceChain.id
      )

      // if source chain is Arbitrum One, add Arbitrum Nova to destination
      if (networks.sourceChain.id === ChainId.ArbitrumOne) {
        destinationChainIds.push(ChainId.ArbitrumNova)
      }

      // if source chain is Arbitrum Nova, add Arbitrum One to destination
      if (networks.sourceChain.id === ChainId.ArbitrumNova) {
        destinationChainIds.push(ChainId.ArbitrumOne)
      }

      return (
        destinationChainIds
          // remove self
          .filter(chainId => chainId !== networks.destinationChain.id)
          .map(getWagmiChain)
      )
    }

    const destinationChains = getDestinationChains()

    return {
      to: {
        disabled:
          isSmartContractWallet ||
          isLoadingAccountType ||
          destinationChains.length === 0,
        options: destinationChains,
        value: networks.destinationChain,
        onChange: async network => {
          onChange(network.id)

          setNetworks({
            sourceChainId: networks.sourceChain.id,
            destinationChainId: network.id
          })
          actions.app.setSelectedToken(null)
        }
      }
    }
  }, [
    isSmartContractWallet,
    isLoadingAccountType,
    networks.destinationChain,
    networks.sourceChain.id,
    onChange,
    setNetworks,
    actions.app
  ])

  return (
    <NetworkContainer
      network={networks.destinationChain}
      customAddress={destinationAddress}
    >
      <NetworkContainer.NetworkListboxPlusBalancesContainer>
        <NetworkListbox label="To:" {...networkListboxProps.to} />
        <NetworkContainer.BalancesContainer>
          {destinationAddressOrWalletAddress &&
            utils.isAddress(destinationAddressOrWalletAddress) && (
              <>
                <NetworkContainer.TokenBalance
                  balance={
                    isDepositMode
                      ? selectedTokenBalances.l2
                      : selectedTokenBalances.l1
                  }
                  on={isDepositMode ? NetworkType.l2 : NetworkType.l1}
                  forToken={selectedToken}
                  prefix={selectedToken ? 'Balance: ' : ''}
                />
                {/* In deposit mode, when user selected USDC on mainnet,
                the UI shows the Arb One balance of both USDC.e and native USDC */}
                {isDepositMode && showUSDCSpecificInfo && (
                  <NetworkContainer.TokenBalance
                    balance={
                      (isArbitrumOne
                        ? erc20L2Balances?.[CommonAddress.ArbitrumOne.USDC]
                        : erc20L2Balances?.[
                            CommonAddress.ArbitrumSepolia.USDC
                          ]) ?? constants.Zero
                    }
                    on={NetworkType.l2}
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
                    <NetworkContainer.TokenBalance
                      on={isDepositMode ? NetworkType.l2 : NetworkType.l1}
                      balance={
                        isDepositMode
                          ? customFeeTokenBalances.l2
                          : customFeeTokenBalances.l1
                      }
                      forToken={nativeCurrency}
                      prefix={selectedToken ? '' : 'Balance: '}
                    />
                    {!isDepositMode && (
                      <NetworkContainer.ETHBalance balance={ethL1Balance} />
                    )}
                  </>
                ) : (
                  <NetworkContainer.ETHBalance
                    balance={isDepositMode ? ethL2Balance : ethL1Balance}
                    prefix={selectedToken ? '' : 'Balance: '}
                  />
                )}
              </>
            )}
        </NetworkContainer.BalancesContainer>
      </NetworkContainer.NetworkListboxPlusBalancesContainer>
      <EstimatedGas chainType="destination" />
    </NetworkContainer>
  )
}
