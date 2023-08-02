import { Provider } from '@ethersproject/providers'
import { Signer, utils } from 'ethers'
import { useCallback } from 'react'
import { useToken } from 'wagmi'
import { getTokenAllowanceForSpender } from '../../util/TokenUtils'
import { useCCTP, UseCCTPParams, getContracts } from './useCCTP'

export function useApproveAndDeposit({
  sourceChainId,
  walletAddress
}: UseCCTPParams) {
  const { approveForBurn, depositForBurn } = useCCTP({
    sourceChainId,
    walletAddress
  })
  const { usdcContractAddress, tokenMessengerContractAddress } =
    getContracts(sourceChainId)
  const { data: usdcToken } = useToken({ address: usdcContractAddress })
  const approveAndDepositForBurn = useCallback(
    async ({
      amount,
      provider,
      signer,
      destinationAddress,
      onAllowanceTooLow,
      onApproveTxFailed,
      onDepositTxFailed
    }: {
      amount: string
      provider: Provider
      signer: Signer
      destinationAddress: `0x${string}`
      onAllowanceTooLow?: () => Promise<boolean>
      onApproveTxFailed: (error: unknown) => void
      onDepositTxFailed: (error: unknown) => void
    }) => {
      if (!walletAddress || !usdcToken) {
        return false
      }

      const { decimals, address } = usdcToken
      const amountRaw = utils.parseUnits(amount, decimals)
      const allowance = await getTokenAllowanceForSpender({
        account: walletAddress,
        erc20Address: address,
        provider,
        spender: tokenMessengerContractAddress
      })

      if (allowance.lt(amountRaw)) {
        const shouldContinue = await onAllowanceTooLow?.()
        if (!shouldContinue) {
          return
        }

        try {
          const tx = await approveForBurn(amountRaw, signer)
          await tx.wait()
        } catch (e) {
          onApproveTxFailed(e)
          return
        }
      }

      let depositForBurnTx
      try {
        depositForBurnTx = await depositForBurn({
          amount: amountRaw,
          signer,
          recipient: destinationAddress
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
