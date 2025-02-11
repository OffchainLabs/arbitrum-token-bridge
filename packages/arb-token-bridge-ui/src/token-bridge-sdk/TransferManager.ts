import { BigNumber, Signer, utils } from 'ethers'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { BridgeTransfer, BridgeTransferStarter } from './BridgeTransferStarter'
import { isAddress } from 'ethers/lib/utils'
import { BridgeTransferStarterFactory } from './BridgeTransferStarterFactory'
import { getOftV2TransferConfig } from './oftUtils'
import { OftV2TransferStarter } from './OftV2TransferStarter'
import { CctpTransferStarter } from './CctpTransferStarter'
import { ERC20BridgeToken } from '../hooks/arbTokenBridge.types'
import { AnalyticsEventMap } from '../util/AnalyticsUtils'
import { isGatewayRegistered } from '../util/TokenUtils'
import { DepositGasEstimates } from '../hooks/arbTokenBridge.types'

export type TransferContext = {
  amount: BigNumber
  amount2?: BigNumber
  signer: Signer
  sourceChainProvider: StaticJsonRpcProvider
  destinationChainProvider: StaticJsonRpcProvider
  destinationAddress: string
  sourceChainErc20Address?: string
  destinationChainErc20Address?: string
  isSmartContractWallet: boolean
  isTeleportMode: boolean
  isDepositMode: boolean
  walletAddress: string
  selectedToken?: ERC20BridgeToken
  sourceChainId: number
  destinationChainId: number
  isBatchTransfer: boolean
  nativeCurrencyDecimals: number
  isCctp: boolean
  isOftTransfer: boolean
  onTokenApprovalNeeded: () => Promise<boolean>
  onNativeCurrencyApprovalNeeded: () => Promise<boolean>
  onWithdrawalConfirmationNeeded: () => Promise<boolean>
  onCustomDestinationAddressConfirmationNeeded: () => Promise<boolean>
  onFirstTimeTokenBridgingConfirmationNeeded: () => Promise<boolean>
  onSmartContractWalletDelayNeeded: () => Promise<void>
  onCctpDepositConfirmationNeeded: () => Promise<
    'bridge-normal-usdce' | 'bridge-cctp-usd' | false
  >
  onCctpWithdrawalConfirmationNeeded: () => Promise<boolean>
  onTrackEvent: <T extends keyof AnalyticsEventMap>(
    event: T,
    data: AnalyticsEventMap[T]
  ) => void
}

export async function validateTransfer(
  context: TransferContext
): Promise<void> {
  const { signer, isSmartContractWallet, isTeleportMode, destinationAddress } =
    context

  if (!signer) {
    throw new Error('Signer is required')
  }

  // SC Teleport transfers aren't enabled yet
  if (isSmartContractWallet && isTeleportMode) {
    throw new Error(
      'Smart contract wallet teleport transfers are not supported'
    )
  }

  // Check destination address validity
  if (destinationAddress && !isAddress(destinationAddress)) {
    throw new Error('Invalid destination address')
  }
}

export async function handleTokenApproval(
  context: TransferContext,
  transferStarter:
    | OftV2TransferStarter
    | CctpTransferStarter
    | BridgeTransferStarter
): Promise<void> {
  const {
    amount,
    signer,
    onTokenApprovalNeeded,
    isSmartContractWallet,
    onSmartContractWalletDelayNeeded
  } = context

  const isTokenApprovalRequired = await transferStarter.requiresTokenApproval({
    amount,
    signer
  })

  if (!isTokenApprovalRequired) {
    return
  }

  // Get user confirmation
  if (onTokenApprovalNeeded) {
    const confirmed = await onTokenApprovalNeeded()
    if (!confirmed) {
      throw new Error('User rejected token approval')
    }
  }

  // Show delay for smart contract wallets
  if (isSmartContractWallet && onSmartContractWalletDelayNeeded) {
    await onSmartContractWalletDelayNeeded()
  }

  const approvalTx = await transferStarter.approveToken({
    signer,
    amount
  })

  if (approvalTx) {
    await approvalTx.wait()
  }
}

export async function handleCctpConfirmation(
  context: TransferContext
): Promise<void> {
  const {
    isDepositMode,
    onCctpDepositConfirmationNeeded,
    onCctpWithdrawalConfirmationNeeded,
    isSmartContractWallet,
    onCustomDestinationAddressConfirmationNeeded,
    destinationAddress,
    walletAddress
  } = context

  // Get CCTP transfer confirmation
  if (isDepositMode && onCctpDepositConfirmationNeeded) {
    const result = await onCctpDepositConfirmationNeeded()
    if (!result) {
      throw new Error('User rejected CCTP deposit')
    }
    if (result === 'bridge-normal-usdce') {
      throw new Error('User selected normal bridge')
    }
  } else if (!isDepositMode && onCctpWithdrawalConfirmationNeeded) {
    const confirmed = await onCctpWithdrawalConfirmationNeeded()
    if (!confirmed) {
      throw new Error('User rejected CCTP withdrawal')
    }
  }

  // Get custom destination address confirmation if needed
  if (
    isSmartContractWallet &&
    destinationAddress?.toLowerCase() === walletAddress?.toLowerCase() &&
    onCustomDestinationAddressConfirmationNeeded
  ) {
    const confirmed = await onCustomDestinationAddressConfirmationNeeded()
    if (!confirmed) {
      throw new Error('User rejected custom destination address')
    }
  }
}

async function handleBatchTransferGasEstimates(
  context: TransferContext,
  bridgeTransferStarter: BridgeTransferStarter
): Promise<{ maxSubmissionCost?: BigNumber; excessFeeRefundAddress?: string }> {
  const { amount, amount2, signer, destinationAddress, isBatchTransfer } =
    context

  if (!isBatchTransfer || !amount2) {
    return {}
  }

  const gasEstimates = (await bridgeTransferStarter.transferEstimateGas({
    amount,
    signer,
    destinationAddress
  })) as DepositGasEstimates

  if (!gasEstimates.estimatedChildChainSubmissionCost) {
    throw new Error('Failed to estimate deposit maxSubmissionCost')
  }

  return {
    maxSubmissionCost: utils
      .parseEther(amount2.toString())
      .add(gasEstimates.estimatedChildChainSubmissionCost),
    excessFeeRefundAddress: destinationAddress
  }
}

async function handleNativeCurrencyApproval(
  context: TransferContext,
  bridgeTransferStarter: BridgeTransferStarter
): Promise<void> {
  const { amount, signer, destinationAddress, onNativeCurrencyApprovalNeeded } =
    context

  const isNativeCurrencyApprovalRequired =
    await bridgeTransferStarter.requiresNativeCurrencyApproval({
      signer,
      amount,
      destinationAddress
    })

  if (!isNativeCurrencyApprovalRequired) {
    return
  }

  if (onNativeCurrencyApprovalNeeded) {
    const confirmed = await onNativeCurrencyApprovalNeeded()
    if (!confirmed) {
      throw new Error('User rejected native currency approval')
    }
  }

  const approvalTx = await bridgeTransferStarter.approveNativeCurrency({
    signer,
    amount
  })

  if (approvalTx) {
    await approvalTx.wait()
  }
}

export async function handleStandardBridgeTransfer(
  context: TransferContext
): Promise<BridgeTransfer> {
  const {
    sourceChainId,
    destinationChainId,
    sourceChainErc20Address,
    destinationChainErc20Address,
    selectedToken,
    isDepositMode,
    sourceChainProvider,
    destinationChainProvider,
    amount,
    signer,
    destinationAddress
  } = context

  // Initialize bridge transfer starter
  const bridgeTransferStarter = BridgeTransferStarterFactory.create({
    sourceChainId,
    destinationChainId,
    sourceChainErc20Address,
    destinationChainErc20Address
  })

  // Check for token suspension if it's a deposit
  if (isDepositMode && selectedToken) {
    const isTokenSuspended = !(await isGatewayRegistered({
      erc20ParentChainAddress: selectedToken.address,
      parentChainProvider: sourceChainProvider,
      childChainProvider: destinationChainProvider
    }))

    if (isTokenSuspended) {
      throw new Error('Token deposits are currently suspended')
    }
  }

  // Handle batch transfer gas estimates
  const overrides = await handleBatchTransferGasEstimates(
    context,
    bridgeTransferStarter
  )

  // Handle approvals
  await handleTokenApproval(context, bridgeTransferStarter)
  await handleNativeCurrencyApproval(context, bridgeTransferStarter)

  // Execute the transfer
  return bridgeTransferStarter.transfer({
    amount,
    signer,
    destinationAddress,
    overrides
  })
}

export async function handleOftTransfer(
  context: TransferContext
): Promise<BridgeTransfer> {
  const {
    sourceChainId,
    destinationChainId,
    sourceChainErc20Address,
    amount,
    signer,
    destinationAddress,
    sourceChainProvider,
    destinationChainProvider
  } = context

  if (!sourceChainErc20Address) {
    throw new Error('Source chain ERC20 address is required for OFT transfer')
  }

  const oftConfig = getOftV2TransferConfig({
    sourceChainId,
    destinationChainId,
    sourceChainErc20Address
  })

  if (!oftConfig.isValid) {
    throw new Error('Invalid OFT configuration')
  }

  const oftTransferStarter = new OftV2TransferStarter({
    sourceChainProvider,
    destinationChainProvider,
    sourceChainErc20Address
  })

  await handleTokenApproval(context, oftTransferStarter)

  return oftTransferStarter.transfer({
    amount,
    signer,
    destinationAddress
  })
}

export async function handleCctpTransfer(
  context: TransferContext
): Promise<BridgeTransfer> {
  const {
    amount,
    signer,
    destinationAddress,
    sourceChainProvider,
    destinationChainProvider
  } = context

  const cctpTransferStarter = new CctpTransferStarter({
    sourceChainProvider,
    destinationChainProvider
  })

  await handleTokenApproval(context, cctpTransferStarter)
  await handleCctpConfirmation(context)

  return cctpTransferStarter.transfer({
    amount,
    signer,
    destinationAddress
  })
}

export async function executeTransfer(
  context: TransferContext
): Promise<BridgeTransfer> {
  await validateTransfer(context)

  const { isCctp, isOftTransfer } = context

  // Handle OFT transfers
  if (isOftTransfer) {
    return handleOftTransfer(context)
  }

  // Handle CCTP transfers
  if (isCctp) {
    return handleCctpTransfer(context)
  }

  // Handle standard bridge transfers
  return handleStandardBridgeTransfer(context)
}
