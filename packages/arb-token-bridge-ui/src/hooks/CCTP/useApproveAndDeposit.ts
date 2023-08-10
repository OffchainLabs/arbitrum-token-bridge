import { Provider } from '@ethersproject/providers'
import { BigNumber, Signer } from 'ethers'
import { useCallback } from 'react'
import { useToken } from 'wagmi'
import { getTokenAllowanceForSpender } from '../../util/TokenUtils'
import { useCCTP, UseCCTPParams, getContracts } from './useCCTP'

export function useApproveAndDeposit({
  sourceChainId,
  walletAddress
}: UseCCTPParams & { walletAddress: `0x${string}` | undefined }) {
  const { approveForBurn, depositForBurn } = useCCTP({
    sourceChainId
  })
  const { usdcContractAddress, tokenMessengerContractAddress } =
    getContracts(sourceChainId)
  const { data: usdcToken } = useToken({
    address: usdcContractAddress,
    chainId: sourceChainId
  })
  const approveAndDepositForBurn = useCallback(
    async ({
      amount,
      provider,
      signer,
      destinationAddress,
      onAllowanceTooLow = async () => {
        return true
      },
      onApproveTxFailed,
      onDepositTxFailed
    }: {
      amount: BigNumber
      provider: Provider
      signer: Signer
      destinationAddress: string | undefined
      onAllowanceTooLow?: () => Promise<boolean>
      onApproveTxFailed: (error: unknown) => void
      onDepositTxFailed: (error: unknown) => void
    }) => {
      if (!walletAddress || !usdcToken) {
        return
      }

      const { address } = usdcToken
      const allowance = await getTokenAllowanceForSpender({
        account: walletAddress,
        erc20Address: address,
        provider,
        spender: tokenMessengerContractAddress
      })

      if (allowance.lt(amount)) {
        if (!(await onAllowanceTooLow())) {
          return
        }

        try {
          const tx = await approveForBurn(amount, signer)
          await tx.wait()
        } catch (e) {
          onApproveTxFailed(e)
          return
        }
      }

      let depositForBurnTx
      try {
        depositForBurnTx = await depositForBurn({
          amount,
          signer,
          recipient: destinationAddress || walletAddress
        })
      } catch (e) {
        onDepositTxFailed(e)
        return
      }

      return depositForBurnTx
    },
    [
      approveForBurn,
      depositForBurn,
      tokenMessengerContractAddress,
      usdcToken,
      walletAddress
    ]
  )

  return { approveAndDepositForBurn }
}
