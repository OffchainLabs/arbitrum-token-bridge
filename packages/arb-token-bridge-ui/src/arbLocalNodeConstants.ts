import { ArbitrumNetwork } from '@arbitrum/sdk'

export const defaultL2Network: ArbitrumNetwork = {
  chainId: 412346,
  parentChainId: 1337,
  confirmPeriodBlocks: 20,
  ethBridge: {
    bridge: '0x5eCF728ffC5C5E802091875f96281B5aeECf6C49',
    inbox: '0x9f8c1c641336A371031499e3c362e40d58d0f254',
    outbox: '0x50143333b44Ea46255BEb67255C9Afd35551072F',
    rollup: '0x46966d871d29e1772c2809459469f849d8AAb1A3',
    sequencerInbox: '0x18d19C5d3E685f5be5b9C86E097f0E439285D216'
  },
  isCustom: true,
  name: 'Arbitrum Local',
  retryableLifetimeSeconds: 604800,
  tokenBridge: {
    parentCustomGateway: '0x8407E6180dC009D20D26D4BABB4790C1d4E6D2aA',
    parentErc20Gateway: '0x00D9fE1a2B67B8151aEdE8855c95E58D73FB4245',
    parentGatewayRouter: '0x093AAa96CD4387A68FC0e24C60140938Dc812549',
    parentMultiCall: '0x49117fC32930E324F2E9A7BeA588FFb26008b8eC',
    parentProxyAdmin: '0x2A1f38c9097e7883570e0b02BFBE6869Cc25d8a3',
    parentWeth: '0x7E32b54800705876d3b5cFbc7d9c226a211F7C1a',
    parentWethGateway: '0xB8F48Ba39fCfB44d70F6008fe1bf4F3E744044AF',
    childCustomGateway: '0x0B35cfE62314C3852A0942b5830c728353BD654F',
    childErc20Gateway: '0x7424e3DAAAAcd867c85ceB75c1E00119F2ee5eb7',
    childGatewayRouter: '0x32656396981868E925280FB772b3f806892cf4bF',
    childMultiCall: '0x6B1E93aE298B64e8f5b9f43B65Dd8F1eaA6DD4c3',
    childProxyAdmin: '0x9F95547ABB0FfC92b4E37b3124d1e8613d5aB74A',
    childWeth: '0xA1abD387192e3bb4e84D3109181F9f005aBaF5CA',
    childWethGateway: '0x67aE8014BD1A0c1Ed747715d22b3b3a188aC324B'
  }
  //   l1TokenBridgeCreator: '0x4Af567288e68caD4aA93A272fe6139Ca53859C70',
  //   retryableSender: '0x75E0E92A79880Bd81A69F72983D03c75e2B33dC8'
}
