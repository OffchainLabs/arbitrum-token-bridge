import { EthBridger } from '@arbitrum/sdk'
import { BigNumber, constants } from 'ethers'
import {
  ApproveNativeCurrencyEstimateGasProps,
  ApproveNativeCurrencyProps,
  BridgeTransferStarter,
  RequiresNativeCurrencyApprovalProps,
  TransferEstimateGas,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { getAddressFromSigner, percentIncrease } from './utils'
import { depositEthEstimateGas } from '../util/EthDepositUtils'
import { fetchErc20Allowance } from '../util/TokenUtils'
import { IWETH9__factory } from '@arbitrum/sdk/dist/lib/abi/factories/IWETH9__factory'
import { Erc20DepositStarter } from './Erc20DepositStarter'

export class EthDepositStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'eth_deposit'

  private ethBridger: EthBridger | undefined

  private async getBridger(): Promise<EthBridger> {
    if (this.ethBridger) {
      return this.ethBridger
    }

    this.ethBridger = await EthBridger.fromProvider(
      this.destinationChainProvider
    )

    return this.ethBridger
  }

  private isTransferToCustomGasTokenChain() {
    if (!this.ethBridger) {
      return false
    }

    const nativeToken = this.ethBridger.l2Network.nativeToken
    return nativeToken && nativeToken !== constants.AddressZero
  }

  private wrapAndDepositWeth = async ({ amount, signer }: TransferProps) => {
    const wethContract = IWETH9__factory.connect(
      '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
      signer
    )
    const wethTx = await wethContract.deposit({ value: amount })

    await wethTx.wait()

    const erc20Bridger = new Erc20DepositStarter({
      sourceChainProvider: this.sourceChainProvider,
      sourceChainErc20Address: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
      destinationChainProvider: this.destinationChainProvider
    })

    const requiresApproval = await erc20Bridger.requiresTokenApproval({
      amount,
      signer
    })

    if (requiresApproval) {
      await erc20Bridger.approveToken({ signer, amount })
    }

    const tx = await erc20Bridger.transfer({ amount, signer })

    return {
      ...tx,
      transferType: this.transferType
    }
  }

  public async requiresNativeCurrencyApproval({
    amount,
    signer
  }: RequiresNativeCurrencyApprovalProps) {
    const address = await getAddressFromSigner(signer)
    const ethBridger = await this.getBridger()

    const { l2Network } = ethBridger

    if (typeof l2Network.nativeToken === 'undefined') {
      return false // native currency doesn't require approval
    }

    const customFeeTokenAllowanceForInbox = await fetchErc20Allowance({
      address: l2Network.nativeToken,
      provider: this.sourceChainProvider,
      owner: address,
      spender: l2Network.ethBridge.inbox
    })

    // We want to bridge a certain amount of the custom fee token, so we have to check if the allowance is enough.
    return customFeeTokenAllowanceForInbox.lt(amount)
  }

  public async approveNativeCurrencyEstimateGas({
    signer,
    amount
  }: ApproveNativeCurrencyEstimateGasProps) {
    const ethBridger = await this.getBridger()
    const txRequest = ethBridger.getApproveGasTokenRequest({ amount })

    return signer.estimateGas(txRequest)
  }

  public async approveNativeCurrency({
    signer,
    amount
  }: ApproveNativeCurrencyProps) {
    const ethBridger = await this.getBridger()
    return ethBridger.approveGasToken({
      l1Signer: signer,
      amount
    })
  }

  public requiresTokenApproval = async () => false

  public approveTokenEstimateGas = async () => {
    // no-op
  }

  public approveToken = async () => {
    // no-op
  }

  public async transferEstimateGas({ amount, signer }: TransferEstimateGas) {
    const address = await getAddressFromSigner(signer)

    if (this.isTransferToCustomGasTokenChain()) {
    }

    // TODO: estimate gas for wrapping + transfer
    return depositEthEstimateGas({
      amount,
      address,
      parentChainProvider: this.sourceChainProvider,
      childChainProvider: this.destinationChainProvider
    })
  }

  public async transfer({ amount, signer }: TransferProps) {
    const address = await getAddressFromSigner(signer)
    const ethBridger = await this.getBridger()

    if (this.isTransferToCustomGasTokenChain()) {
      // We are sending ETH to a chain with the native token other than ETH.
      // We have to take a different route where we wrap it and send WETH instead.
      console.log('Wrap + deposit eth')
      return this.wrapAndDepositWeth({ amount, signer })
    }

    const depositRequest = await ethBridger.getDepositRequest({
      amount,
      from: address
    })

    const gasLimit = await this.sourceChainProvider.estimateGas(
      depositRequest.txRequest
    )

    const sourceChainTransaction = await ethBridger.deposit({
      amount,
      l1Signer: signer,
      overrides: { gasLimit: percentIncrease(gasLimit, BigNumber.from(5)) }
    })

    console.log('here-0')

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction,
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
