import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { Wallet, utils } from 'ethers'

import { EthDeposit } from './EthDeposit'
import { EthDepositStarter } from './EthDepositStarter'

const fromChainProvider = new StaticJsonRpcProvider('http://localhost:8545')
const toChainProvider = new StaticJsonRpcProvider('http://localhost:8547')

const fromChainSigner = new Wallet('').connect(fromChainProvider)

describe('EthDepositStarter', () => {
  it('initiates a deposit', async () => {
    const ethDepositStarter = new EthDepositStarter({
      fromChainProvider,
      toChainProvider
    })

    const tx = await ethDepositStarter.start({
      fromChainSigner,
      amount: utils.parseEther('0.1')
    })

    const txReceipt = await tx.wait()

    const transfer = await EthDeposit.create({
      fromChainProvider,
      fromChainTxHash: txReceipt.transactionHash
    })

    await transfer.status({ toChainProvider })
  })
})
