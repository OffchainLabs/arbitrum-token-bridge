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

type NetworkListboxesProps = {
  to: Omit<NetworkListboxProps, 'label'>
}

function useNetworkListBoxProps({
  onChange
}: {
  onChange: (networkId: number) => void
}): NetworkListboxesProps {
  const actions = useActions()
  const [networks, setNetworks] = useNetworks()
  const { isSmartContractWallet, isLoading: isLoadingAccountType } =
    useAccountType()

  return useMemo(() => {
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
}

/**  In deposit mode, when user selected USDC on mainnet,
 * the UI shows the Arb One balance of both USDC.e and native USDC
 */
function DepositModeUSDCSpecificInfo() {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChain, isDepositMode } = useNetworksRelationship(networks)
  const { isArbitrumOne, isArbitrumSepolia } = isNetwork(childChain.id)

  const { erc20L2Balances } = useBalances()

  const showUSDCSpecificInfo =
    (isTokenMainnetUSDC(selectedToken?.address) && isArbitrumOne) ||
    (isTokenSepoliaUSDC(selectedToken?.address) && isArbitrumSepolia)

  const isDepositModeUSDC = isDepositMode && showUSDCSpecificInfo

  if (!isDepositModeUSDC) {
    return null
  }

  return (
    <NetworkContainer.TokenBalance
      balance={
        (isArbitrumOne
          ? erc20L2Balances?.[CommonAddress.ArbitrumOne.USDC]
          : erc20L2Balances?.[CommonAddress.ArbitrumSepolia.USDC]) ??
        constants.Zero
      }
      on={NetworkType.l2}
      forToken={selectedToken ? { ...selectedToken, symbol: 'USDC' } : null}
      tokenSymbolOverride="USDC"
    />
  )
}

function CustomGasTokenChainDestinationBalances() {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const customFeeTokenBalances = useCustomFeeTokenBalances()
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const { ethL1Balance } = useBalances()

  // TODO: refactor everything that relies on this to use source/destination instead of l1/l2
  const destinationChainLayer = isDepositMode ? 'l2' : 'l1'

  if (!nativeCurrency.isCustom) {
    return null
  }

  return (
    <>
      <NetworkContainer.TokenBalance
        on={NetworkType[destinationChainLayer]}
        balance={customFeeTokenBalances[destinationChainLayer]}
        forToken={nativeCurrency}
        prefix={selectedToken ? '' : 'Balance: '}
      />
      {!isDepositMode && <NetworkContainer.ETHBalance balance={ethL1Balance} />}
    </>
  )
}

export function DestinationNetworkContainer({
  onChange
}: {
  onChange: (networkId: number) => void
}) {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const { address: walletAddress } = useAccount()
  const { destinationAddress } = useDestinationAddressStore()
  const selectedTokenBalances = useSelectedTokenBalances()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const { ethL1Balance, ethL2Balance } = useBalances()

  const networkListboxProps = useNetworkListBoxProps({ onChange })

  // TODO: refactor everything that relies on this to use source/destination instead of l1/l2
  const destinationChainLayer = isDepositMode ? 'l2' : 'l1'

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
                  balance={selectedTokenBalances[destinationChainLayer]}
                  on={NetworkType[destinationChainLayer]}
                  forToken={selectedToken}
                  prefix={selectedToken ? 'Balance: ' : ''}
                />
                <DepositModeUSDCSpecificInfo />
                <CustomGasTokenChainDestinationBalances />
                {!nativeCurrency.isCustom && (
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
