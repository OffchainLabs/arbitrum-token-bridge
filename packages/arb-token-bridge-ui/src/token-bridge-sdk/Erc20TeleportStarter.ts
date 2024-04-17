import { Erc20L1L3Bridger, getL2Network } from '@arbitrum/sdk'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { constants } from 'ethers'
import {
  ApproveNativeCurrencyProps,
  ApproveTokenProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresNativeCurrencyApprovalProps,
  RequiresTokenApprovalProps,
  TransferEstimateGas,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { fetchErc20Allowance } from '../util/TokenUtils'
import { getAddressFromSigner } from './utils'
import { getL2ConfigForTeleport } from './teleport'

export class Erc20TeleportStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'erc20_teleport'

  constructor(props: BridgeTransferStarterProps) {
    super(props)

    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }
  }

  public async requiresNativeCurrencyApproval({
    amount,
    signer
  }: RequiresNativeCurrencyApprovalProps) {
    return false
  }

  public async approveNativeCurrency({
    signer,
    amount
  }: ApproveNativeCurrencyProps) {
    // get the intermediate L2 chain provider
    const { l2Provider } = await getL2ConfigForTeleport({
      destinationChainProvider: this.destinationChainProvider
    })

    const l3Network = await getL2Network(this.destinationChainProvider)

    const l1l3Bridger = new Erc20L1L3Bridger(l3Network)

    return l1l3Bridger.approveFeeToken({
      l1Signer: signer,
      l2Provider,
      amount
    })
  }

  public requiresTokenApproval = async ({
    amount,
    signer
  }: RequiresTokenApprovalProps) => {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    const l3Network = await getL2Network(this.destinationChainProvider)

    const l1l3Bridger = new Erc20L1L3Bridger(l3Network)

    const l1TeleporterAddress = l1l3Bridger.teleporterAddresses.l1Teleporter

    const allowanceForTeleporter = await fetchErc20Allowance({
      address: this.sourceChainErc20Address,
      provider: this.sourceChainProvider,
      owner: address,
      spender: l1TeleporterAddress
    })

    return amount.gte(allowanceForTeleporter)
  }

  public async approveTokenEstimateGas({ signer, amount }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }
    const address = await getAddressFromSigner(signer)

    const l3Network = await getL2Network(this.destinationChainProvider)
    const l1l3Bridger = new Erc20L1L3Bridger(l3Network)
    const l1TeleporterAddress = l1l3Bridger.teleporterAddresses.l1Teleporter

    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address,
      this.sourceChainProvider
    )
    return contract.estimateGas.approve(
      l1TeleporterAddress,
      amount ?? constants.MaxUint256,
      {
        from: address
      }
    )
  }

  public async approveToken({ signer, amount }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const l3Network = await getL2Network(this.destinationChainProvider)

    const l1l3Bridger = new Erc20L1L3Bridger(l3Network)

    return l1l3Bridger.approveToken({
      erc20L1Address: this.sourceChainErc20Address,
      l1Signer: signer,
      amount
    })
  }

  public async transferEstimateGas({ amount, signer }: TransferEstimateGas) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    // get the intermediate L2 chain provider
    const { l2Provider } = await getL2ConfigForTeleport({
      destinationChainProvider: this.destinationChainProvider
    })

    const l3Network = await getL2Network(this.destinationChainProvider)
    const l1l3Bridger = new Erc20L1L3Bridger(l3Network)

    const depositRequest = await l1l3Bridger.getDepositRequest({
      l1Signer: signer,
      erc20L1Address: this.sourceChainErc20Address,
      amount,
      l2Provider,
      l3Provider: this.destinationChainProvider
    })

    return {
      estimatedParentChainGas: depositRequest.feeTokenAmount,
      estimatedChildChainGas: constants.Zero
    }
  }

  public async transfer({ amount, signer }: TransferProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    // // get the intermediate L2 chain provider
    const { l2Provider } = await getL2ConfigForTeleport({
      destinationChainProvider: this.destinationChainProvider
    })

    const l3Network = await getL2Network(this.destinationChainProvider)
    const l1l3Bridger = new Erc20L1L3Bridger(l3Network)

    const depositRequest = await l1l3Bridger.getDepositRequest({
      l1Signer: signer,
      erc20L1Address: this.sourceChainErc20Address,
      amount,
      l2Provider,
      l3Provider: this.destinationChainProvider
    })

    const tx = await l1l3Bridger.deposit({
      txRequest: depositRequest.txRequest,
      l1Signer: signer
    })

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: tx,
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
