import { constants, utils } from 'ethers'
import { useAccount } from 'wagmi'

import { useNetworks } from '../../../hooks/useNetworks'
import { useDestinationAddressStore } from '../AdvancedSettings'
import {
  BalancesContainer,
  ETHBalance,
  NetworkContainer,
  NetworkListboxPlusBalancesContainer
} from '../TransferPanelMain'
import { TokenBalance } from './TokenBalance'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { NetworkType } from './utils'
import { useAppState } from '../../../state'
import { sanitizeTokenSymbol } from '../../../util/TokenUtils'
import { useBalances } from '../../../hooks/useBalances'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { isNetwork } from '../../../util/networks'
import { EstimatedGas } from '../EstimatedGas'
import { useSelectedTokenBalances } from '../../../hooks/TransferPanel/useSelectedTokenBalances'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useDialog } from '../../common/Dialog'
import {
  NetworkButton,
  NetworkSelectionContainer
} from '../../common/NetworkSelectionContainer'
import { useNativeCurrencyBalances } from './useNativeCurrencyBalances'
import { useIsBatchTransferSupported } from '../../../hooks/TransferPanel/useIsBatchTransferSupported'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'

function NativeCurrencyDestinationBalance({ prefix }: { prefix?: string }) {
  const nativeCurrencyBalances = useNativeCurrencyBalances()
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)

  return (
    <ETHBalance
      balance={nativeCurrencyBalances.destinationBalance}
      on={isDepositMode ? NetworkType.childChain : NetworkType.parentChain}
      prefix={prefix}
    />
  )
}

function DestinationNetworkBalance({
  showUsdcSpecificInfo
}: {
  showUsdcSpecificInfo: boolean
}) {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChain, childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const { isArbitrumOne } = isNetwork(childChain.id)

  const { erc20ChildBalances } = useBalances()
  const nativeCurrencyBalances = useNativeCurrencyBalances()
  const selectedTokenBalances = useSelectedTokenBalances()

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  if (selectedToken) {
    return (
      <>
        <TokenBalance
          balance={
            isDepositMode
              ? selectedTokenBalances.childBalance
              : selectedTokenBalances.parentBalance
          }
          on={isDepositMode ? NetworkType.childChain : NetworkType.parentChain}
          forToken={selectedToken}
          tokenSymbolOverride={
            // we need to send the proper, sanitized token-name to the component
            selectedToken?.symbol
              ? sanitizeTokenSymbol(selectedToken?.symbol, {
                  chainId: networks.destinationChain.id,
                  erc20L1Address: selectedToken?.address
                })
              : undefined
          }
          prefix="Balance: "
        />
        {/* In deposit mode, when user selected USDC on mainnet,
        the UI shows the Arb One balance of both USDC.e and native USDC */}
        {showUsdcSpecificInfo && isDepositMode && (
          <TokenBalance
            balance={
              (isArbitrumOne
                ? erc20ChildBalances?.[CommonAddress.ArbitrumOne.USDC]
                : erc20ChildBalances?.[CommonAddress.ArbitrumSepolia.USDC]) ??
              constants.Zero
            }
            on={NetworkType.childChain}
            forToken={
              selectedToken ? { ...selectedToken, symbol: 'USDC' } : null
            }
            tokenSymbolOverride="USDC"
          />
        )}
      </>
    )
  }

  if (nativeCurrency.isCustom) {
    return (
      <TokenBalance
        on={isDepositMode ? NetworkType.childChain : NetworkType.parentChain}
        balance={nativeCurrencyBalances.destinationBalance}
        forToken={nativeCurrency}
        prefix="Balance: "
      />
    )
  }

  return <NativeCurrencyDestinationBalance prefix="Balance: " />
}

export function DestinationNetworkBox({
  showUsdcSpecificInfo
}: {
  showUsdcSpecificInfo: boolean
}) {
  const { address: walletAddress } = useAccount()
  const [networks] = useNetworks()
  const { destinationAddress } = useDestinationAddressStore()
  const [{ amount2 }] = useArbQueryParams()
  const isBatchTransferSupported = useIsBatchTransferSupported()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress
  const [
    destinationNetworkSelectionDialogProps,
    openDestinationNetworkSelectionDialog
  ] = useDialog()

  return (
    <>
      <NetworkContainer
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
                  <DestinationNetworkBalance
                    showUsdcSpecificInfo={showUsdcSpecificInfo}
                  />
                  {isBatchTransferSupported && Number(amount2) > 0 && (
                    <NativeCurrencyDestinationBalance />
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
      />
    </>
  )
}
