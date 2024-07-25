import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { BigNumber, Signer, Wallet, constants, utils } from 'ethers'
import 'dotenv/config'

const INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY
if (typeof INFURA_KEY === 'undefined') {
  throw new Error('Infura API key not provided')
}
if (!process.env.PRIVATE_KEY_CUSTOM) {
  throw new Error('PRIVATE_KEY_CUSTOM variable missing.')
}
if (!process.env.PRIVATE_KEY_USER) {
  throw new Error('PRIVATE_KEY_USER variable missing.')
}

const userWallet = new Wallet(process.env.PRIVATE_KEY_USER)

const ethRpcUrl = process.env.NEXT_PUBLIC_LOCAL_ETHEREUM_RPC_URL
const arbRpcUrl = process.env.NEXT_PUBLIC_LOCAL_ARBITRUM_RPC_URL

const ethProvider = new StaticJsonRpcProvider(ethRpcUrl)
const arbProvider = new StaticJsonRpcProvider(arbRpcUrl)

const localWallet = new Wallet(process.env.PRIVATE_KEY_CUSTOM)

let counter = 0

const main = async () => {
  async function fundWalletEth(
    walletAddress: string,
    networkType: 'L1' | 'L2'
  ) {
    const provider = networkType === 'L1' ? ethProvider : arbProvider
    const tx = await localWallet.connect(provider).sendTransaction({
      to: walletAddress,
      value: utils.parseEther('1')
    })
    await tx.wait()
  }
  const wait = (ms = 0): Promise<void> => {
    return new Promise(res => setTimeout(res, ms))
  }
  const keepMining = async (miner: Signer, networkType?: 'L1' | 'L2') => {
    while (true) {
      counter++
      await (
        await miner.sendTransaction({
          to: await miner.getAddress(),
          value: 0,
          data: '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000010c3c627574746f6e20636c6173733d226e61766261722d746f67676c65722220747970653d22627574746f6e2220646174612d746f67676c653d22636f6c6c617073652220646174612d7461726765743d22236e6176626172537570706f72746564436f6e74656e742220617269612d636f6e74726f6c733d226e6176626172537570706f72746564436f6e74656e742220617269612d657870616e6465643d2266616c73652220617269612d6c6162656c3d223c253d20676574746578742822546f67676c65206e617669676174696f6e222920253e223e203c7370616e20636c6173733d226e61766261722d746f67676c65722d69636f6e223e3c2f7370616e3e203c2f627574746f6e3e0000000000000000000000000000000000000000'
        })
      ).wait()

      if (networkType) {
        console.log(
          `${Date.now()}: Tx ${counter} - mining on ${networkType}...`
        )
      }
      await wait(500)
    }
  }
  // whilst waiting for status we mine on both l1 and l2
  console.log('Funding miner 1...')
  const miner1 = Wallet.createRandom().connect(ethProvider)
  await fundWalletEth(await miner1.getAddress(), 'L1')

  console.log('Funding miner 2...')
  const miner2 = Wallet.createRandom().connect(arbProvider)
  await fundWalletEth(await miner2.getAddress(), 'L2')

  console.log('Starting mining on both chains so that assertions are posted...')
  await Promise.allSettled([keepMining(miner1, 'L1'), keepMining(miner2, 'L2')])

  console.log('>>> Mining finished')
}

main()
