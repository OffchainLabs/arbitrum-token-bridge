import { Chain } from 'viem/chains'
import { createPublicClient, http } from 'viem'

export const arbPublicClient = (chain: Chain) =>
  createPublicClient({
    chain,
    transport: http()
  })
