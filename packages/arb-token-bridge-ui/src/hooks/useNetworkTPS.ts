import axios from 'axios'
import { load } from 'cheerio'
import { getExplorerUrl, isNetwork } from 'src/util/networks'
import useSWR from 'swr'
import { useNetworksAndSigners } from './useNetworksAndSigners'

const emptyStats = { tps: null }

const fetchNetworkTPS = async (l2ChainId: number) => {
  // currently we only support TPS information for Arb-one and nova
  // return null for rest of the networks
  const canFetchTPS =
    isNetwork(Number(l2ChainId)).isArbitrumNova ||
    isNetwork(Number(l2ChainId)).isArbitrumOne
  if (!canFetchTPS) return emptyStats

  // url from where we'll fetch stats
  const explorerUrl = getExplorerUrl(Number(l2ChainId))

  // for 403 or CORS blocked errors while scraping external endpoints, we use cors-proxy
  const finalUrl = `https://corsproxy.io/?${encodeURIComponent(explorerUrl!)}`
  const response = await axios.get(finalUrl)

  // Get the HTML code of the webpage
  const html = response.data
  const $ = load(html)
  const tpsElement = $(
    'span[title="Transactions per Second - Adjusted for Arbitrum Nitro system txs"]'
  )
  const tps = (tpsElement?.text() || '')
    .trim()
    .replace(/[()]/g, '')
    .split(' ')[0]

  return { tps: isNaN(Number(tps)) ? null : Number(tps) }
}

export const useNetworkTPS = () => {
  const {
    l2: {
      network: { chainID: l2ChainId }
    }
  } = useNetworksAndSigners()

  return useSWR(
    ['tps', l2ChainId],
    ([, _l2ChainId]) => fetchNetworkTPS(_l2ChainId),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: false
    }
  )
}
