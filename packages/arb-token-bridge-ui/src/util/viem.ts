import { Chain } from 'viem/chains'
import { createPublicClient, http } from 'viem'

export const createArbPublicClient = (chain: Chain) =>
  createPublicClient({
    chain,
    transport: http()
  })
