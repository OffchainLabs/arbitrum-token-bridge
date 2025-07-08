export const CommonAddress = {
  Ethereum: {
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    tokenMessengerContractAddress: '0xbd3fa81b58ba92a82136038b25adec7066af3155'
  },
  ArbitrumOne: {
    USDC: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    'USDC.e': '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    USDT: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    tokenMessengerContractAddress: '0x19330d10d9cc8751218eaf51e8885d058642e08a',
    CU: '0x89c49a3fa372920ac23ce757a029e6936c0b8e02'
  },
  // Xai Mainnet
  660279: {
    CU: '0x89c49a3fa372920ac23ce757a029e6936c0b8e02'
  },
  Sepolia: {
    USDC: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
    tokenMessengerContractAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'
  },
  ArbitrumSepolia: {
    USDC: '0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d',
    'USDC.e': '0x119f0e6303bec7021b295ecab27a4a1a5b37ecf0',
    tokenMessengerContractAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'
  },
  Base: {
    USDC: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'
  },
  ApeChain: {
    USDCe: '0xf1815bd50389c46847f0bda824ec8da914045d14',
    WETH: '0xf4d9235269a96aadafc9adae454a0618ebe37949'
  },
  Superposition: {
    USDCe: '0x6c030c5cc283f791b26816f325b9c632d964f8a1'
  }
} as const
