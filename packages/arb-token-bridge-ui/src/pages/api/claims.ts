import axios from 'axios'
import { NextApiRequest, NextApiResponse } from 'next'
import { utils } from 'ethers'
import { ChainId } from '../../util/networks'

type Request = NextApiRequest & {
  query: { address: string; l1ChainId: number; l2ChainId: number }
}
type EtherscanTransaction = {
  blockNumber: string
  blockHash: string
  timeStamp: string
  hash: string
  nonce: string
  transactionIndex: string
  from: string
  to: string
  value: string
  gas: string
  gasPrice: string
  input: string
  methodId: string
  functionName: string
  contractAddress: string
  cumulativeGasUsed: string
  txreceipt_status: string
  gasUsed: string
  confirmations: string
  isError: string
}
export type ClaimTransaction = EtherscanTransaction & {
  l2TimeStamp: string
  l2Block: string
}

function loadEnvironmentVariable(key: string): string {
  const value = process.env[key]

  if (typeof value === 'undefined') {
    throw new Error(`Missing "${key}" environment variable`)
  }

  return value
}

function getEtherscanApiEndpoint(l1ChainId: number) {
  switch (l1ChainId) {
    case ChainId.Mainnet:
      return 'https://api.etherscan.io/api'

    case ChainId.Goerli:
      return 'https://api-goerli.etherscan.io/api'

    case ChainId.Sepolia:
      return 'https://api-sepolia.etherscan.io/api'

    default:
      throw Error('Unsupported network')
  }
}

function getOutboxAddress(l2ChainId: number) {
  switch (l2ChainId) {
    case ChainId.ArbitrumOne:
      return '0x0B9857ae2D4A3DBe74ffE1d7DF045bb7F96E4840'

    case ChainId.ArbitrumNova:
      return '0xD4B80C3D7240325D18E645B49e6535A3Bf95cc58'

    case ChainId.ArbitrumGoerli:
      return '0x45Af9Ed1D03703e480CE7d328fB684bb67DA5049'

    case ChainId.ArbitrumSepolia:
      return '0x65f07C7D521164a4d5DaC6eB8Fac8DA067A3B78F'

    default:
      throw Error('Unsupported network')
  }
}

const apiKey = loadEnvironmentVariable('NEXT_PUBLIC_ETHERSCAN_API_KEY')

export default async function handler(
  req: Request,
  res: NextApiResponse<{ data: boolean | undefined; message?: string }>
) {
  try {
    // validate method
    if (req.method !== 'GET') {
      res
        .status(400)
        .send({ message: `invalid_method: ${req.method}`, data: undefined })
      return
    }

    const { address, l1ChainId, l2ChainId } = req.query

    if (typeof address !== 'string') {
      res.status(400).send({
        message: `invalid_parameter: expected 'address' to be a string but got ${typeof address}`,
        data: undefined
      })
      return
    }

    if (isNaN(Number(l1ChainId))) {
      res.status(400).send({
        message: `invalid_parameter: expected 'l1ChainId' to be a number`,
        data: undefined
      })
      return
    }

    if (isNaN(Number(l2ChainId))) {
      res.status(400).send({
        message: `invalid_parameter: expected 'l2ChainId' to be a number`,
        data: undefined
      })
      return
    }

    const finalUrl = `${getEtherscanApiEndpoint(
      Number(l1ChainId)
    )}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc&apikey=${apiKey}`
    const data = await (await axios.get(finalUrl)).data

    res.status(200).json({
      data: data.result
        .filter((tx: any) => {
          return tx.to === getOutboxAddress(Number(l2ChainId)).toLowerCase()
        })
        .map((tx: any) => {
          try {
            const iface = new utils.Interface([
              'function executeTransaction(bytes32[] proof, uint256 index, address l2Sender, address to, uint256 l2Block, uint256 l1Block, uint256 l2Timestamp, uint256 value, bytes data)'
            ])
            const decodedeData = iface.decodeFunctionData(
              'executeTransaction',
              tx.input
            )
            return {
              ...tx,
              l2TimeStamp: decodedeData.l2Timestamp.toString(),
              l2Block: decodedeData.l2Block.toString()
            } as ClaimTransaction
          } catch (e) {
            return tx
          }
        })
    })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: undefined
    })
  }
}
