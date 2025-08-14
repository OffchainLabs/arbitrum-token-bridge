import { useMemo } from 'react'
import { constants } from 'ethers'
import { useAccount } from 'wagmi'

import { useNetworks } from '../../../hooks/useNetworks'
import { NetworkContainer } from '../TransferPanelMain'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useBalances } from '../../../hooks/useBalances'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { isNetwork } from '../../../util/networks'
import { useSelectedTokenBalances } from '../../../hooks/TransferPanel/useSelectedTokenBalances'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { useDialog2, DialogWrapper } from '../../common/Dialog2'
import { NetworkButton } from '../../common/NetworkSelectionContainer'
import { useNativeCurrencyBalances } from './useNativeCurrencyBalances'
import { useIsBatchTransferSupported } from '../../../hooks/TransferPanel/useIsBatchTransferSupported'
import { SafeImage } from '../../common/SafeImage'
import { useTokensFromLists, useTokensFromUser } from '../TokenSearchUtils'
import { formatAmount } from '../../../util/NumberUtils'
import { Loader } from '../../common/atoms/Loader'
import { useAmount2InputVisibility } from './SourceNetworkBox'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { useIsCctpTransfer } from '../hooks/useIsCctpTransfer'
import { sanitizeTokenSymbol } from '../../../util/TokenUtils'
import { useRouteStore } from '../hooks/useRouteStore'
import { getTokenOverride } from '../../../pages/api/crosschain-transfers/utils'

function BalanceRow({
  parentErc20Address,
  balance,
  logoOverride,
  symbolOverride
}: {
  parentErc20Address?: string
  balance: string | undefined
  logoOverride?: string
  symbolOverride?: string
}) {
  const [networks] = useNetworks()
  const [{ destinationAddress }] = useArbQueryParams()
  const { isConnected } = useAccount()
  const { childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const tokensFromLists = useTokensFromLists()
  const tokensFromUser = useTokensFromUser()

  const tokenLogoSrc = useMemo(() => {
    if (logoOverride) {
      return logoOverride
    }

    if (parentErc20Address) {
      return (
        tokensFromLists[parentErc20Address]?.logoURI ??
        tokensFromUser[parentErc20Address]?.logoURI
      )
    }

    return nativeCurrency.logoUrl
  }, [
    nativeCurrency.logoUrl,
    parentErc20Address,
    tokensFromLists,
    tokensFromUser
  ])

  const symbol = useMemo(() => {
    if (symbolOverride) {
      return symbolOverride
    }

    if (parentErc20Address) {
      return (
        tokensFromLists[parentErc20Address]?.symbol ??
        tokensFromUser[parentErc20Address]?.symbol
      )
    }

    return nativeCurrency.symbol
  }, [
    symbolOverride,
    nativeCurrency.symbol,
    parentErc20Address,
    tokensFromLists,
    tokensFromUser
  ])

  const shouldShowBalance = !isConnected ? !!destinationAddress : true

  return (
    <div className="flex justify-between py-3 text-sm">
      <div className="flex items-center space-x-1.5">
        <SafeImage
          src={tokenLogoSrc}
          alt={`${symbol} logo`}
          className="h-4 w-4 shrink-0"
        />
        <span>{symbol}</span>
      </div>
      {shouldShowBalance && (
        <div className="flex space-x-1">
          <span>Balance: </span>
          <span
            aria-label={`${symbol} balance amount on ${
              isDepositMode ? 'childChain' : 'parentChain'
            }`}
          >
            {balance ? (
              balance
            ) : (
              <Loader wrapperClass="ml-2" size="small" color="white" />
            )}
          </span>
        </div>
      )}
    </div>
  )
}

function BalancesContainer() {
  const [networks] = useNetworks()
  const { childChain } = useNetworksRelationship(networks)
  const { isArbitrumOne } = isNetwork(childChain.id)
  const isCctpTransfer = useIsCctpTransfer()
  const [selectedToken] = useSelectedToken()
  const selectedRoute = useRouteStore(state => state.selectedRoute)
  const { erc20ChildBalances } = useBalances()
  const isBatchTransferSupported = useIsBatchTransferSupported()
  const { isAmount2InputVisible } = useAmount2InputVisibility()
  const { destination } = useMemo(
    () =>
      getTokenOverride({
        destinationChainId: networks.destinationChain.id,
        fromToken: selectedToken?.address,
        sourceChainId: networks.sourceChain.id
      }),
    [
      selectedToken?.address,
      networks.destinationChain.id,
      networks.sourceChain.id
    ]
  )

  const nativeCurrencyBalances = useNativeCurrencyBalances()
  const selectedTokenBalances = useSelectedTokenBalances()

  const selectedTokenOrNativeCurrencyBalance = selectedToken
    ? selectedTokenBalances.destinationBalance
    : nativeCurrencyBalances.destinationBalance

  // For cctp transfer, if no route are selected, display USDC balance on destination chain
  const showNativeUsdcBalance =
    (isCctpTransfer && selectedRoute === 'cctp') ||
    (isCctpTransfer && !selectedRoute)

  const tokenOverride = useMemo(() => {
    const override = getTokenOverride({
      fromToken: selectedToken?.address,
      sourceChainId: networks.sourceChain.id,
      destinationChainId: networks.destinationChain.id
    })
    if (!override) {
      return null
    }

    return override.destination
  }, [selectedToken, networks])

  return (
    <div
      className="rounded px-3 text-white/70 [&>*+*]:border-t [&>*+*]:border-gray-600"
      style={{ backgroundColor: '#00000050' }}
    >
      {showNativeUsdcBalance ? (
        <BalanceRow
          parentErc20Address={
            isArbitrumOne
              ? CommonAddress.Ethereum.USDC
              : CommonAddress.ArbitrumOne.USDC
          }
          balance={formatAmount(
            (isArbitrumOne
              ? erc20ChildBalances?.[CommonAddress.ArbitrumOne.USDC]
              : erc20ChildBalances?.[CommonAddress.ArbitrumSepolia.USDC]) ??
              constants.Zero,
            {
              decimals: selectedToken?.decimals
            }
          )}
          symbolOverride="USDC"
        />
      ) : (
        <BalanceRow
          parentErc20Address={selectedToken?.address}
          balance={
            selectedTokenOrNativeCurrencyBalance
              ? formatAmount(selectedTokenOrNativeCurrencyBalance, {
                  decimals: selectedToken ? selectedToken.decimals : 18
                })
              : undefined
          }
          symbolOverride={
            tokenOverride
              ? tokenOverride.symbol
              : selectedToken
              ? sanitizeTokenSymbol(selectedToken.symbol, {
                  chainId: networks.destinationChain.id,
                  erc20L1Address: selectedToken.address
                })
              : undefined
          }
          logoOverride={destination ? destination.logoURI : undefined}
        />
      )}

      {isBatchTransferSupported && isAmount2InputVisible && (
        <BalanceRow
          balance={
            nativeCurrencyBalances.destinationBalance
              ? formatAmount(nativeCurrencyBalances.destinationBalance)
              : undefined
          }
        />
      )}
    </div>
  )
}

export function DestinationNetworkBox() {
  const [networks] = useNetworks()
  const [{ destinationAddress }] = useArbQueryParams()
  const [dialogProps, openDialog] = useDialog2()
  const openDestinationNetworkSelectionDialog = () => {
    openDialog('destination_network_selection')
  }

  return (
    <>
      <NetworkContainer
        network={networks.destinationChain}
        customAddress={destinationAddress}
      >
        <div className="flex justify-between">
          <NetworkButton
            type="destination"
            onClick={openDestinationNetworkSelectionDialog}
          />
        </div>
        <BalancesContainer />
      </NetworkContainer>
      <DialogWrapper {...dialogProps} />
    </>
  )
}
