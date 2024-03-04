import { BridgeTransfer } from './BridgeTransfer'
import { EthDeposit } from './EthDeposit'
import { Erc20Deposit } from './Erc20Deposit'
import { EthOrErc20Withdrawal } from './EthOrErc20Withdrawal'
import { getBridgeTransferProperties } from './utils'
import { getProviderForChainId } from '../hooks/useNetworks'
import { CctpTransfer } from './CctpTransfer'

type BridgeTransferFactoryProps = {
  sourceChainTxHash: string
  sourceChainId: number
  destinationChainId: number
  sourceChainErc20Address?: string
  isNativeCurrencyTransfer?: boolean // optionally, if `sourceChainErc20Address` is not known, use this flag
  isCctpTransfer?: boolean // optionally, if we know if it's a USDC-CCTP transfer
}

export class BridgeTransferFactory {
  public static init(
    initProps: BridgeTransferFactoryProps
  ): Promise<BridgeTransfer> {
    const {
      sourceChainTxHash,
      sourceChainId,
      destinationChainId,
      sourceChainErc20Address,
      isNativeCurrencyTransfer: isNativeCurrencyTransferFromProps,
      isCctpTransfer: isCctpTransferFromProps
    } = initProps

    const {
      isDeposit,
      isNativeCurrencyTransfer: isNativeCurrencyTransferDeduced,
      isUsdcTransfer
    } = getBridgeTransferProperties({
      sourceChainId,
      destinationChainId,
      sourceChainErc20Address
    })

    const sourceChainProvider = getProviderForChainId(sourceChainId)
    const destinationChainProvider = getProviderForChainId(destinationChainId)

    const isNativeCurrencyTransfer =
      isNativeCurrencyTransferFromProps || isNativeCurrencyTransferDeduced

    const isCctpTransfer = isCctpTransferFromProps || isUsdcTransfer

    if (isCctpTransfer) {
      // return USDC deposit/withdrawal
      console.log('bridge-sdk transaction: USDC Deposit/Withdrawal')
      return CctpTransfer.initializeFromSourceChainTxHash({
        sourceChainTxHash,
        sourceChainProvider,
        destinationChainProvider
      })
    }

    if (isDeposit && isNativeCurrencyTransfer) {
      // return Eth deposit
      console.log('bridge-sdk transaction: Eth Deposit')
      return EthDeposit.initializeFromSourceChainTxHash({
        sourceChainTxHash,
        sourceChainProvider,
        destinationChainProvider
      })
    }

    if (isDeposit && !isNativeCurrencyTransfer) {
      // return Erc20 deposit
      console.log('bridge-sdk transaction: Erc20 Deposit')
      return Erc20Deposit.initializeFromSourceChainTxHash({
        sourceChainTxHash,
        sourceChainProvider,
        destinationChainProvider
      })
    }

    if (!isDeposit) {
      // return Eth/Erc20 withdrawal
      console.log('bridge-sdk transaction: Eth/Erc20 Withdrawal')
      return EthOrErc20Withdrawal.initializeFromSourceChainTxHash({
        sourceChainTxHash,
        sourceChainProvider,
        destinationChainProvider,
        isNativeCurrencyTransfer
      })
    }

    // else throw an error - chain pair not valid eg. L1-to-L3 transfer,
    throw Error('bridge-sdk mode: unhandled mode detected')
  }
}
