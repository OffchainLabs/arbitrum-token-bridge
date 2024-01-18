export const CommonAddress = {
  Ethereum: {
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    tokenMessengerContractAddress: '0xbd3fa81b58ba92a82136038b25adec7066af3155'
  },
  ArbitrumOne: {
    USDC: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    'USDC.e': '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    tokenMessengerContractAddress: '0x19330d10d9cc8751218eaf51e8885d058642e08a'
  },
  Sepolia: {
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    tokenMessengerContractAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'
  },
  ArbitrumSepolia: {
    USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    'USDC.e': '0x8fb1e3fc51f3b789ded7557e680551d93ea9d892', // todo: this is for goerli for now
    tokenMessengerContractAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'
  }
} as const
