import { useMemo } from 'react'
import { constants } from 'ethers'
import Image from 'next/image'

import { useNetworks } from '../../../hooks/useNetworks'
import { NetworkContainer } from '../TransferPanelMain'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useBalances } from '../../../hooks/useBalances'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { isNetwork } from '../../../util/networks'
import { EstimatedGas } from '../EstimatedGas'
import { useSelectedTokenBalances } from '../../../hooks/TransferPanel/useSelectedTokenBalances'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { NetworkButton } from '../../common/NetworkSelectionContainer'
import { useNativeCurrencyBalances } from './useNativeCurrencyBalances'
import { useIsBatchTransferSupported } from '../../../hooks/TransferPanel/useIsBatchTransferSupported'
import { getBridgeUiConfigForChain } from '../../../util/bridgeUiConfig'
import { SafeImage } from '../../common/SafeImage'
import { useTokensFromLists, useTokensFromUser } from '../TokenSearchUtils'
import { formatAmount } from '../../../util/NumberUtils'
import { Loader } from '../../common/atoms/Loader'
import { useAmount2InputVisibility } from './SourceNetworkBox'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { useIsCctpTransfer } from '../hooks/useIsCctpTransfer'
import { sanitizeTokenSymbol } from '../../../util/TokenUtils'
import { DialogWrapper, useDialog2 } from '../../common/Dialog2'

function BalanceRow({
  parentErc20Address,
  balance,
  symbolOverride
}: {
  parentErc20Address?: string
  balance: string | undefined
  symbolOverride?: string
}) {
  const [networks] = useNetworks()
  const { childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const tokensFromLists = useTokensFromLists()
  const tokensFromUser = useTokensFromUser()

  const tokenLogoSrc = useMemo(() => {
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
    </div>
  )
}

function BalancesContainer() {
  const [networks] = useNetworks()
  const { childChain, isDepositMode } = useNetworksRelationship(networks)
  const { isArbitrumOne } = isNetwork(childChain.id)
  const isCctpTransfer = useIsCctpTransfer()
  const [selectedToken] = useSelectedToken()

  const isBatchTransferSupported = useIsBatchTransferSupported()
  const { isAmount2InputVisible } = useAmount2InputVisibility()

  const { erc20ChildBalances } = useBalances()
  const nativeCurrencyBalances = useNativeCurrencyBalances()
  const selectedTokenBalances = useSelectedTokenBalances()

  const selectedTokenOrNativeCurrencyBalance = selectedToken
    ? selectedTokenBalances.destinationBalance
    : nativeCurrencyBalances.destinationBalance

  return (
    <div
      className="rounded px-3 text-white [&>*+*]:border-t [&>*+*]:border-gray-600"
      style={{ backgroundColor: '#00000050' }}
    >
      {isCctpTransfer && isDepositMode && (
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
      )}
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
          selectedToken
            ? sanitizeTokenSymbol(selectedToken.symbol, {
                chainId: networks.destinationChain.id,
                erc20L1Address: selectedToken.address
              })
            : undefined
        }
      />
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
  const {
    network: { logo: networkLogo }
  } = getBridgeUiConfigForChain(networks.destinationChain.id)

  return (
    <>
      <NetworkContainer
        network={networks.destinationChain}
        customAddress={destinationAddress}
      >
        <div className="flex justify-between">
          <NetworkButton
            type="destination"
            onClick={() => openDialog('destination_networks')}
          />
          <div className="relative h-[44px] w-[44px]">
            <Image
              src={networkLogo}
              alt={`${networks.destinationChain.name} logo`}
              layout={'fill'}
              objectFit={'contain'}
            />
          </div>
        </div>
        <BalancesContainer />
        <EstimatedGas chainType="destination" />
      </NetworkContainer>
      <DialogWrapper {...dialogProps} />
    </>
  )
}
