import { constants } from 'ethers'
import Image from 'next/image'

import { useNetworks } from '../../../hooks/useNetworks'
import { useDestinationAddressStore } from '../AdvancedSettings'
import { NetworkContainer } from '../TransferPanelMain'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useAppState } from '../../../state'
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
import { formatAmount } from '../../../util/NumberUtils'
import { Loader } from '../../common/atoms/Loader'
import { getBridgeUiConfigForChain } from '../../../util/bridgeUiConfig'

function BalanceRow({
  symbol,
  balance
}: {
  symbol: string
  balance: string | undefined
}) {
  return (
    <div className="flex justify-between py-3 text-sm">
      <span>{symbol}</span>
      <div className="flex">
        Balance:{' '}
        {balance ? (
          balance
        ) : (
          <Loader wrapperClass="ml-2" size="small" color="white" />
        )}
      </div>
    </div>
  )
}

function BalancesContainer({
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
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const { isArbitrumOne } = isNetwork(childChain.id)

  const [{ amount2 }] = useArbQueryParams()
  const isBatchTransferSupported = useIsBatchTransferSupported()

  const { erc20ChildBalances } = useBalances()
  const nativeCurrencyBalances = useNativeCurrencyBalances()
  const selectedTokenBalances = useSelectedTokenBalances()

  const selectedTokenDestinationBalance = isDepositMode
    ? selectedTokenBalances.childBalance
    : selectedTokenBalances.parentBalance

  const selectedTokenOrNativeCurrencyBalance = selectedToken
    ? selectedTokenDestinationBalance
    : nativeCurrencyBalances.destinationBalance

  return (
    <div
      className="rounded px-4 text-white [&>*+*]:border-t [&>*+*]:border-gray-600"
      style={{ backgroundColor: '#00000050' }}
    >
      <BalanceRow
        symbol={selectedToken ? selectedToken.symbol : nativeCurrency.symbol}
        balance={
          selectedTokenOrNativeCurrencyBalance
            ? formatAmount(selectedTokenOrNativeCurrencyBalance, {
                decimals: selectedToken
                  ? selectedToken.decimals
                  : nativeCurrency.decimals
              })
            : undefined
        }
      />
      {isBatchTransferSupported && Number(amount2) > 0 && (
        <BalanceRow
          symbol={nativeCurrency.symbol}
          balance={
            nativeCurrencyBalances.destinationBalance
              ? formatAmount(nativeCurrencyBalances.destinationBalance, {
                  decimals: nativeCurrency.decimals
                })
              : undefined
          }
        />
      )}
      {showUsdcSpecificInfo && isDepositMode && (
        <BalanceRow
          symbol="USDC.e"
          balance={formatAmount(
            (isArbitrumOne
              ? erc20ChildBalances?.[CommonAddress.ArbitrumOne.USDC]
              : erc20ChildBalances?.[CommonAddress.ArbitrumSepolia.USDC]) ??
              constants.Zero
          )}
        />
      )}
    </div>
  )
}

export function DestinationNetworkBox({
  showUsdcSpecificInfo
}: {
  showUsdcSpecificInfo: boolean
}) {
  const [networks] = useNetworks()
  const { destinationAddress } = useDestinationAddressStore()
  const [
    destinationNetworkSelectionDialogProps,
    openDestinationNetworkSelectionDialog
  ] = useDialog()
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
            onClick={openDestinationNetworkSelectionDialog}
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
        <BalancesContainer showUsdcSpecificInfo={showUsdcSpecificInfo} />
        <EstimatedGas chainType="destination" />
      </NetworkContainer>
      <NetworkSelectionContainer
        {...destinationNetworkSelectionDialogProps}
        type="destination"
      />
    </>
  )
}
