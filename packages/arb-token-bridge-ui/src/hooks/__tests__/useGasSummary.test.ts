jest.mock('../useNetworks', () => ({
  useNetworks: jest.fn()
}))

jest.mock('../useSelectedToken', () => ({
  useSelectedToken: jest.fn().mockReturnValue([
    {
      type: 'ERC20',
      decimals: 18,
      name: 'random',
      symbol: 'RAND',
      address: '0x123',
      l2Address: '0x234',
      listIds: new Set('1')
    },
    jest.fn()
  ])
}))

describe('useGasSummary', () => {})
