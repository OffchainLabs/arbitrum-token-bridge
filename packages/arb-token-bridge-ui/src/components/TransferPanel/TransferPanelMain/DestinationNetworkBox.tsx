import { constants } from 'ethers'

import { useNetworks } from '../../../hooks/useNetworks'
import { useDestinationAddressStore } from '../AdvancedSettings'
import {
  BalancesContainer,
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
import { ether } from '../../../constants'
import { formatAmount } from '../../../util/NumberUtils'
import { Loader } from '../../common/atoms/Loader'
import { useAmount2InputVisibility } from './SourceNetworkBox'
import { useIsCctpTransfer } from '../hooks/useIsCctpTransfer'

function NativeCurrencyDestinationBalance({ prefix }: { prefix?: string }) {
  const nativeCurrencyBalances = useNativeCurrencyBalances()
  const [networks] = useNetworks()
  const nativeCurrency = useNativeCurrency({
    provider: networks.destinationChainProvider
  })
  const { isDepositMode } = useNetworksRelationship(networks)

  if (nativeCurrency.isCustom) {
    return (
      <TokenBalance
        forToken={nativeCurrency}
        balance={nativeCurrencyBalances.destinationBalance}
        on={isDepositMode ? NetworkType.childChain : NetworkType.parentChain}
        prefix={prefix}
      />
    )
  }
  if (!nativeCurrencyBalances.destinationBalance) {
    return (
      <p className="flex items-center gap-1">
        <span className="font-light">{prefix}</span>
        <Loader color="white" size="small" />
      </p>
    )
  }

  return (
    <p>
      <span className="font-light">{prefix}</span>
      <span
        aria-label={`ETH balance amount on ${
          isDepositMode ? NetworkType.childChain : NetworkType.parentChain
        }`}
      >
        {formatAmount(nativeCurrencyBalances.destinationBalance, {
          symbol: ether.symbol
        })}
      </span>
    </p>
  )
}

function DestinationNetworkBalance() {
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

  const isCctpTransfer = useIsCctpTransfer()

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
        {isCctpTransfer && isDepositMode && (
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

export function DestinationNetworkBox() {
  const [networks] = useNetworks()
  const { destinationAddress } = useDestinationAddressStore()
  const isBatchTransferSupported = useIsBatchTransferSupported()
  const [
    destinationNetworkSelectionDialogProps,
    openDestinationNetworkSelectionDialog
  ] = useDialog()
  const { isAmount2InputVisible } = useAmount2InputVisibility()

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
            <DestinationNetworkBalance />
            {isBatchTransferSupported && isAmount2InputVisible && (
              <NativeCurrencyDestinationBalance />
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
