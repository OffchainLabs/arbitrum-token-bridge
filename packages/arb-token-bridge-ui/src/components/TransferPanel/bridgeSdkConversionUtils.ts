// the conversion layer for making bridge-sdk results compatible with our current ui code

import { BigNumber, utils } from 'ethers'
import dayjs from 'dayjs'
import { TransactionResponse } from '@ethersproject/providers'

import { BridgeTransfer } from '@/token-bridge-sdk/BridgeTransferStarter'
import {
  DepositStatus,
  MergedTransaction,
  WithdrawalStatus
} from '../../state/app/state'
import { Deposit } from '../../hooks/useTransactionHistory'
import { AssetType, ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { NativeCurrency } from '../../hooks/useNativeCurrency'

type SdkToUiConversionProps = {
  bridgeTransfer: BridgeTransfer
  parentChainId: number
  childChainId: number
  selectedToken: ERC20BridgeToken | null
  walletAddress: string
  destinationAddress?: string
  nativeCurrency: NativeCurrency
  amount: BigNumber
  amount2?: BigNumber
  timestampCreated: string
}

export const convertBridgeSdkToMergedTransaction = ({
  bridgeTransfer,
  parentChainId,
  childChainId,
  selectedToken,
  walletAddress,
  destinationAddress,
  nativeCurrency,
  amount,
  amount2
}: SdkToUiConversionProps): MergedTransaction => {
  const { transferType } = bridgeTransfer
  const isDeposit =
    transferType === 'eth_deposit' ||
    transferType === 'erc20_deposit' ||
    transferType === 'eth_teleport' ||
    transferType === 'erc20_teleport'

  return {
    sender: walletAddress!,
    destination: destinationAddress ?? walletAddress,
    direction: isDeposit ? 'deposit-l1' : 'withdraw',
    status: isDeposit ? 'pending' : WithdrawalStatus.UNCONFIRMED,
    createdAt: dayjs().valueOf(),
    resolvedAt: null,
    txId: bridgeTransfer.sourceChainTransaction.hash,
    asset: selectedToken ? selectedToken.symbol : nativeCurrency.symbol,
    assetType: selectedToken ? AssetType.ERC20 : AssetType.ETH,
    value: utils.formatUnits(
      amount,
      selectedToken ? selectedToken.decimals : nativeCurrency.decimals
    ),
    value2: amount2 ? utils.formatEther(amount2) : undefined,
    depositStatus: isDeposit ? DepositStatus.L1_PENDING : undefined,
    uniqueId: null,
    isWithdrawal: !isDeposit,
    blockNum: null,
    tokenAddress: selectedToken ? selectedToken.address : undefined,
    parentChainId: Number(parentChainId),
    childChainId: Number(childChainId),
    sourceChainId: isDeposit ? Number(parentChainId) : Number(childChainId),
    destinationChainId: isDeposit ? Number(childChainId) : Number(parentChainId)
  } as MergedTransaction
}

export const convertBridgeSdkToPendingDepositTransaction = ({
  bridgeTransfer,
  parentChainId,
  childChainId,
  walletAddress,
  selectedToken,
  nativeCurrency,
  destinationAddress,
  amount,
  amount2,
  timestampCreated
}: SdkToUiConversionProps): Deposit => {
  const transaction =
    bridgeTransfer.sourceChainTransaction as TransactionResponse
  return {
    sender: walletAddress!,
    destination: destinationAddress ?? walletAddress,
    status: 'pending',
    txID: transaction.hash,
    assetName: selectedToken ? selectedToken.symbol : nativeCurrency.symbol,
    assetType: selectedToken ? AssetType.ERC20 : AssetType.ETH,
    l1NetworkID: String(parentChainId),
    l2NetworkID: String(childChainId),
    value: utils.formatUnits(
      amount,
      selectedToken ? selectedToken.decimals : nativeCurrency.decimals
    ),
    value2: amount2 ? utils.formatEther(amount2) : undefined,
    parentChainId,
    childChainId,
    direction: 'deposit',
    type: 'deposit-l1',
    source: 'local_storage_cache',
    timestampCreated: String(timestampCreated),
    nonce: transaction.nonce
  } as Deposit
}
