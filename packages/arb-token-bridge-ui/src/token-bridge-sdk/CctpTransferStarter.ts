import { simulateContract, writeContract } from '@wagmi/core'
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
import {
  cctpWagmiConfig,
  fetchPerMessageBurnLimit,
  getCctpContracts
} from './cctp'
import { getChainIdFromProvider, getAddressFromSigner } from './utils'
import { fetchErc20Allowance } from '../util/TokenUtils'
import { TokenMessengerAbi } from '../util/cctp/TokenMessengerAbi'
import { Address } from '../util/AddressUtils'

export class CctpTransferStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'cctp'

  public requiresNativeCurrencyApproval = async () => false

  public async approveNativeCurrencyEstimateGas() {
    // no-op
  }

  public approveNativeCurrency = async () => {
    return
  }

  public async requiresTokenApproval({
    amount,
    signer,
    destinationAddress
  }: RequiresTokenApprovalProps): Promise<boolean> {
    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)

    const address = await getAddressFromSigner(signer)

    const { usdcContractAddress, tokenMessengerContractAddress } =
      getCctpContracts({ sourceChainId })

    const recipient = destinationAddress ?? address

    const allowance = await fetchErc20Allowance({
      address: usdcContractAddress,
      provider: this.sourceChainProvider,
      owner: recipient,
      spender: tokenMessengerContractAddress
    })

    return allowance.lt(amount)
  }

  public async approveToken({ signer, amount }: ApproveTokenProps) {
    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)

    const { usdcContractAddress, tokenMessengerContractAddress } =
      getCctpContracts({ sourceChainId })

    // approve USDC token for burn
    const contract = ERC20__factory.connect(usdcContractAddress, signer)
    return contract.functions.approve(
      tokenMessengerContractAddress,
      amount ?? constants.MaxInt256
    )
  }

  public async approveTokenEstimateGas({ signer, amount }: ApproveTokenProps) {
    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)
    const { usdcContractAddress, tokenMessengerContractAddress } =
      getCctpContracts({ sourceChainId })
    const contract = ERC20__factory.connect(usdcContractAddress, signer)
    return contract.estimateGas.approve(
      tokenMessengerContractAddress,
      amount ?? constants.MaxInt256
    )
  }

  public async transferEstimateGas() {
    // for cctp transfers we don't call our native gas estimation methods because we have completely different contracts
    return undefined
  }

  public async transfer({ signer, amount, destinationAddress }: TransferProps) {
    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)

    const address = await getAddressFromSigner(signer)

    // cctp has an upper limit for transfer
    const burnLimit = await fetchPerMessageBurnLimit({
      sourceChainId
    })

    if (amount.gt(burnLimit)) {
      const formatedLimit = formatAmount(BigNumber.from(burnLimit), {
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

    const { request } = await simulateContract(cctpWagmiConfig, {
      address: tokenMessengerContractAddress,
      abi: TokenMessengerAbi,
      functionName: 'depositForBurn',
      args: [
        amount.toBigInt(),
        targetChainDomain,
        mintRecipient,
        usdcContractAddress
      ]
    })

    const depositForBurnTx = await writeContract(cctpWagmiConfig, request)

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: { hash: depositForBurnTx },
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
