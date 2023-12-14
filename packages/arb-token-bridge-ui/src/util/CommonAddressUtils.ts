export const CommonAddress = {
  Ethereum: {
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    tokenMinterContract: '0xc4922d64a24675e16e1586e3e3aa56c06fabe907'
  },
  ArbitrumOne: {
    USDC: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    'USDC.e': '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    tokenMinterContract: '0xe7ed1fa7f45d05c508232aa32649d89b73b8ba48'
  },
  Goerli: {
    USDC: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
    tokenMinterContract: '0xca6b4c00831ffb77afe22e734a6101b268b7fcbe'
  },
  ArbitrumGoerli: {
    USDC: '0xfd064a18f3bf249cf1f87fc203e90d8f650f2d63',
    'USDC.e': '0x8fb1e3fc51f3b789ded7557e680551d93ea9d892',
    tokenMinterContract: '0xe997d7d2f6e065a9a93fa2175e878fb9081f1f0a'
  }
} as const
