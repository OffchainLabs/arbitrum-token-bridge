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
import { isTeleport } from '@/token-bridge-sdk/teleport'

type SdkToUiConversionProps = {
  bridgeTransfer: BridgeTransfer
  parentChainId: number
  childChainId: number
  selectedToken: ERC20BridgeToken | null
  walletAddress: string
  destinationAddress?: string
  nativeCurrency: NativeCurrency
  amount: BigNumber
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
  amount
}: SdkToUiConversionProps): MergedTransaction => {
  const { transferType, sourceChainTransaction: tx } = bridgeTransfer
  const isDeposit =
    transferType.includes('deposit') ||
    isTeleport({
      sourceChainId: Number(parentChainId),
      destinationChainId: Number(childChainId)
    })

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
  amount,
  timestampCreated
}: SdkToUiConversionProps): Deposit => {
  const transaction =
    bridgeTransfer.sourceChainTransaction as TransactionResponse
  return {
    sender: walletAddress!,
    destination: walletAddress,
    status: 'pending',
    txID: transaction.hash,
    assetName: nativeCurrency.symbol,
    assetType: AssetType.ETH,
    l1NetworkID: String(parentChainId),
    l2NetworkID: String(childChainId),
    value: utils.formatUnits(
      amount,
      selectedToken ? selectedToken.decimals : nativeCurrency.decimals
    ),
    parentChainId,
    childChainId,
    direction: 'deposit',
    type: 'deposit-l1',
    source: 'local_storage_cache',
    timestampCreated: String(timestampCreated),
    nonce: transaction.nonce
  } as Deposit
}
