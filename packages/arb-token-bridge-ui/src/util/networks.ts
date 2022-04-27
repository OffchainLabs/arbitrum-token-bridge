const INFURA_KEY = process.env.REACT_APP_INFURA_KEY as string

if (!INFURA_KEY) {
  throw new Error('Infura API key not provided')
}

export const rpcURLs: { [chainId: number]: string } = {
  1: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  4: `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
  5: `https://goerli.infura.io/v3/${INFURA_KEY}`,
  42161: 'https://arb1.arbitrum.io/rpc',
  421611: 'https://rinkeby.arbitrum.io/rpc'
}

export const l2DaiGatewayAddresses: { [chainId: number]: string } = {
  42161: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65',
  421611: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65'
}
