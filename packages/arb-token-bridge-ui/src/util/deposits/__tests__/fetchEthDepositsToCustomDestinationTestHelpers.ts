const sender = '0xEF733aDA13D6598bC7340852Bc8fd7E04d9EAc55'

const baseQuery = {
  sender,
  l2ChainId: 421614,
  pageSize: 100
}

export function getQueryCoveringNitroWithoutResults() {
  return { ...baseQuery, fromBlock: 6799500, toBlock: 6800000 }
}

export function getQueryCoveringNitroWithResults() {
  return { ...baseQuery, fromBlock: 6800000, toBlock: 6800220 }
}
