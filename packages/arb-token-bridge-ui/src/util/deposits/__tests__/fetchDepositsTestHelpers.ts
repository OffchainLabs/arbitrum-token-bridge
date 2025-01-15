const sender = '0x5d64a0fd6af0d76a7ed189d4061ffa6823fbf97e'

const baseQuery = {
  sender,
  l2ChainId: 42161,
  childChainId: 42161,
  parentChainId: 1,
  pageSize: 100,
  parentGatewayAddresses: [
    '0xa3A7B6F88361F48403514059F1F16C8E78d60EeC', // Parent Standard Gateway
    '0xcEe284F754E854890e311e3280b767F80797180d', // Parent Custom Gateway
    '0xd92023E9d9911199a6711321D1277285e6d4e2db' // Parent WETH Gateway
  ]
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
