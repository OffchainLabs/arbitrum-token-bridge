import { EthBridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber, Signer, utils } from 'ethers'
import { fetchErc20Allowance } from '../../../util/TokenUtils'
import { NativeCurrency } from '../../../hooks/useNativeCurrency'

type ApproveCustomFeeTokenProps = {
  address: string
  amount: BigNumber
  l1Signer: Signer
  l1Provider: Provider
  l2Provider: Provider
  nativeCurrency: NativeCurrency
  customFeeTokenApproval?: () => Promise<boolean>
}

export async function approveCustomFeeTokenForInbox({
  address,
  amount,
  l1Signer,
  l1Provider,
  l2Provider,
  nativeCurrency,
  customFeeTokenApproval = async () => {
    return false
  }
}: ApproveCustomFeeTokenProps): Promise<boolean> {
  if (typeof address === 'undefined') {
    throw new Error('walletAddress is undefined')
  }

  if (!l1Signer) {
    throw new Error('failed to find signer')
  }

  const ethBridger = await EthBridger.fromProvider(l2Provider)
  const { l2Network } = ethBridger

  if (typeof l2Network.nativeToken === 'undefined') {
    throw new Error('l2 network does not use custom fee token')
  }

  const customFeeTokenAllowanceForInbox = await fetchErc20Allowance({
    address: l2Network.nativeToken,
    provider: l1Provider,
    owner: address,
    spender: l2Network.ethBridge.inbox
  })

  const amountBigNumber = utils.parseUnits(
    amount.toString(),
    nativeCurrency.decimals
  )

  // We want to bridge a certain amount of the custom fee token, so we have to check if the allowance is enough.
  if (!customFeeTokenAllowanceForInbox.gte(amountBigNumber)) {
    const confirmation = await customFeeTokenApproval?.()

    if (!confirmation) {
      return false
    }

    const approveCustomFeeTokenTx = await ethBridger.approveFeeToken({
      l1Signer
    })
    await approveCustomFeeTokenTx.wait()
  }

  return true
}
