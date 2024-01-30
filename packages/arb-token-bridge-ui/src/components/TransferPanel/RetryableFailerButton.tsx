// button shown in E2E test that submits a failed retryable txn

import { useAccount, useSigner } from 'wagmi'
import { useNetworks } from '../../hooks/useNetworks'
import { BigNumber, utils } from 'ethers'
import { Erc20Bridger } from '@arbitrum/sdk'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { addDepositToCache } from '../TransactionHistory/helpers'
import { Button } from '../common/Button'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { DepositStatus } from '../../state/app/state'

export const RetryableFailerButton = () => {
  const [
    {
      sourceChainProvider,
      sourceChain,
      destinationChainProvider,
      destinationChain
    }
  ] = useNetworks()
  const { data: signer } = useSigner()
  const { address } = useAccount()
  const { addPendingTransaction } = useTransactionHistory(address)

  const failRetryable = async () => {
    window.alert('Failing retryable')
    const l1Signer = signer
    if (!l1Signer) throw Error("Can't find signer")

    const walletAddress = await l1Signer.getAddress()
    const l1Provider = sourceChainProvider
    const l2Provider = destinationChainProvider
    const erc20Token = {
      symbol: 'WETH',
      decimals: 18,
      address: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48'
    }

    const l1NetworkID = sourceChain.id.toString()
    const l2NetworkID = destinationChain.id.toString()

    const amount = utils.parseUnits('0.00001', erc20Token.decimals)
    const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)

    const parentChainBlockTimestamp = (await l1Provider.getBlock('latest'))
      .timestamp

    const depositRequest = await erc20Bridger.getDepositRequest({
      l1Provider,
      l2Provider,
      from: walletAddress,
      erc20L1Address: erc20Token.address,
      amount,
      retryableGasOverrides: {
        gasLimit: { base: BigNumber.from(0) }
      }
    })
    const tx = await erc20Bridger.deposit({
      ...depositRequest,
      l1Signer,
      retryableGasOverrides: {
        gasLimit: {
          base: BigNumber.from(0)
        }
      }
    })

    addPendingTransaction({
      sender: walletAddress,
      destination: walletAddress,
      direction: 'deposit-l1',
      status: 'pending',
      createdAt: parentChainBlockTimestamp * 1_000,
      resolvedAt: null,
      txId: tx.hash,
      asset: erc20Token.symbol,
      assetType: AssetType.ERC20,
      value: utils.formatUnits(amount, erc20Token.decimals),
      depositStatus: DepositStatus.L1_PENDING,
      uniqueId: null,
      isWithdrawal: false,
      blockNum: null,
      tokenAddress: erc20Token.address,
      parentChainId: Number(l1NetworkID),
      childChainId: Number(l2NetworkID)
    })

    addDepositToCache({
      sender: walletAddress,
      destination: walletAddress,
      status: 'pending',
      txID: tx.hash,
      assetName: erc20Token.symbol,
      assetType: AssetType.ERC20,
      l1NetworkID,
      l2NetworkID,
      value: utils.formatUnits(amount, erc20Token.decimals),
      parentChainId: Number(l1NetworkID),
      childChainId: Number(l2NetworkID),
      direction: 'deposit',
      type: 'deposit-l1',
      source: 'local_storage_cache',
      timestampCreated: String(parentChainBlockTimestamp),
      nonce: tx.nonce
    })
  }

  return (
    <Button variant="secondary" onClick={failRetryable}>
      Fail Retryable
    </Button>
  )
}
