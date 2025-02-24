import { getArbitrumNetwork } from '@arbitrum/sdk'
import { ethers, Signer } from 'ethers'

const WETH_ABI = [
  {
    constant: false,
    inputs: [],
    name: 'deposit',
    outputs: [],
    payable: true,
    stateMutability: 'payable',
    type: 'function'
  }
]

export async function wrapEther({
  signer,
  sourceChainId,
  amount
}: {
  signer: Signer
  sourceChainId: number
  amount: string | number
}) {
  const wethAddress = getArbitrumNetwork(sourceChainId).tokenBridge?.childWeth

  if (!wethAddress) {
    throw new Error('Error wrapping ETH: No WETH address found.')
  }

  try {
    const wethContract = new ethers.Contract(wethAddress, WETH_ABI, signer)
    const amountInWei = ethers.utils.parseEther(amount.toString())

    const tx = await wethContract.deposit({
      value: amountInWei
    })

    return tx.wait()
  } catch (error) {
    console.error('Error wrapping ETH:', error)
    throw error
  }
}
