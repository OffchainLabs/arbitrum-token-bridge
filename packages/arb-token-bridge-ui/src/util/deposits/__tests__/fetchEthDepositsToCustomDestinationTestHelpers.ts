const sender = '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33'

const baseQuery = {
  sender,
  l2ChainId: 42161,
  pageSize: 100
}

export function getQueryCoveringNitroWithoutResults() {
  return { ...baseQuery, fromBlock: 23_340_100, toBlock: 23_340_110 }
}

/**
 * Transactions:
 * https://etherscan.io/tx/0x49db903399a3b4caa9d99bbac4ca704bd4bad3d247c2d26ccdd0296c96ebf7dd
 * https://etherscan.io/tx/0x6429e7cb8fa7f501d336ec0672755404c9021abe5d19ae07ad875ad2f1ae6537
 */
export function getQueryCoveringNitroWithResults() {
  return { ...baseQuery, fromBlock: 23_340_190, toBlock: 23_340_210 }
}
