const address = '0x5d64a0fd6af0d76a7ed189d4061ffa6823fbf97e'

const baseQuery = {
  address,
  l2ChainId: 42161,
  pageSize: 100
}

export function getQueryCoveringClassicOnlyWithoutResults() {
  return { ...baseQuery, fromBlock: 0, toBlock: 14309825 }
}

export function getQueryCoveringClassicOnlyWithResults() {
  return { ...baseQuery, fromBlock: 14309825, toBlock: 14428639 }
}

export function getQueryCoveringClassicAndNitroWithResults() {
  return { ...baseQuery, fromBlock: 15362737, toBlock: 15517648 }
}
