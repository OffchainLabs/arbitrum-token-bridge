import { prepareWriteContract, writeContract } from '@wagmi/core'
import { BigNumber, constants, utils } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'

import {
  ApproveTokenProps,
  BridgeTransferStarter,
  RequiresTokenApprovalProps,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { formatAmount } from '../util/NumberUtils'
import { fetchPerMessageBurnLimit, getCctpContracts } from './cctp'
import { getChainIdFromProvider, getAddressFromSigner } from './utils'
import { fetchErc20Allowance } from '../util/TokenUtils'
import { TokenMessengerAbi } from '../util/cctp/TokenMessengerAbi'
import { Address } from '../util/AddressUtils'
import { TransactionRequest } from '@ethersproject/providers'

export class CctpTransferStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'cctp'
  public sourceChainId?: number

  public requiresNativeCurrencyApproval = async () => false

  public async approveNativeCurrencyEstimateGas() {
    // no-op
  }

  public approveNativeCurrency = async () => {
    return
  }

  private async getSourceChainId(): Promise<number> {
    if (typeof this.sourceChainId === 'undefined') {
      this.sourceChainId = await getChainIdFromProvider(
        this.sourceChainProvider
      )
    }

    return this.sourceChainId
  }

  public async requiresTokenApproval({
    amount,
    signer
  }: RequiresTokenApprovalProps): Promise<boolean> {
    const {
      //
      usdcContractAddress,
      tokenMessengerContractAddress
    } = getCctpContracts({ sourceChainId: await this.getSourceChainId() })

    const allowance = await fetchErc20Allowance({
      address: usdcContractAddress,
      provider: this.sourceChainProvider,
      owner: await getAddressFromSigner(signer),
      spender: tokenMessengerContractAddress
    })

    return allowance.lt(amount)
  }

  public async approveTokenPrepareTxRequest(params?: {
    amount: BigNumber | undefined
  }): Promise<TransactionRequest> {
    const {
      //
      usdcContractAddress,
      tokenMessengerContractAddress
    } = getCctpContracts({ sourceChainId: await this.getSourceChainId() })

    return {
      to: usdcContractAddress,
      data: ERC20__factory.createInterface().encodeFunctionData('approve', [
        tokenMessengerContractAddress,
        params?.amount ?? constants.MaxInt256
      ]),
      value: BigNumber.from(0)
    }
  }

  public async approveToken({ signer, amount }: ApproveTokenProps) {
    const txRequest = await this.approveTokenPrepareTxRequest({ amount })
    return signer.sendTransaction(txRequest)
  }

  public async approveTokenEstimateGas({ signer, amount }: ApproveTokenProps) {
    const txRequest = await this.approveTokenPrepareTxRequest({ amount })
    return signer.estimateGas(txRequest)
  }

  public async transferEstimateGas() {
    // for cctp transfers we don't call our native gas estimation methods because we have completely different contracts
    return undefined
  }

  public async transfer({ signer, amount, destinationAddress }: TransferProps) {
    const sourceChainId = await this.getSourceChainId()

    const address = await getAddressFromSigner(signer)

    // cctp has an upper limit for transfer
    const burnLimit = await fetchPerMessageBurnLimit({
      sourceChainId
    })

    if (amount.gt(burnLimit)) {
      const formatedLimit = formatAmount(burnLimit, {
        decimals: 6, // hardcode for USDC
        symbol: 'USDC'
      })
      throw Error(
        `The limit for transfers using CCTP is ${formatedLimit}. Please lower your amount and try again.`
      )
    }

    const recipient = destinationAddress ?? address

    // burn token on the selected chain to be transferred from cctp contracts to the other chain

    // CCTP uses 32 bytes addresses, while EVEM uses 20 bytes addresses
    const mintRecipient = utils.hexlify(utils.zeroPad(recipient, 32)) as Address

    const {
      usdcContractAddress,
      tokenMessengerContractAddress,
      targetChainDomain
    } = getCctpContracts({
      sourceChainId
    })

    const config = await prepareWriteContract({
      address: tokenMessengerContractAddress,
      abi: TokenMessengerAbi,
      functionName: 'depositForBurn',
      signer,
      args: [amount, targetChainDomain, mintRecipient, usdcContractAddress]
    })

    const depositForBurnTx = await writeContract(config)

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: depositForBurnTx,
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
