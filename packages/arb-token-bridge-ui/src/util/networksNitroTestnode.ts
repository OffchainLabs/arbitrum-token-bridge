import { ArbitrumNetwork } from '@arbitrum/sdk'

import { ChainId } from '../types/ChainId'

export const defaultL2Network: ArbitrumNetwork = {
  chainId: 412346,
  parentChainId: ChainId.Local,
  confirmPeriodBlocks: 20,
  ethBridge: {
    bridge: '0x5eCF728ffC5C5E802091875f96281B5aeECf6C49',
    inbox: '0x9f8c1c641336A371031499e3c362e40d58d0f254',
    outbox: '0x50143333b44Ea46255BEb67255C9Afd35551072F',
    rollup: '0xe5Ab92C74CD297F0a1F2914cE37204FC5Bc4e82D',
    sequencerInbox: '0x18d19C5d3E685f5be5b9C86E097f0E439285D216'
  },
  isCustom: true,
  isTestnet: true,
  name: 'Nitro Testnode L2',
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
}

export const defaultL3Network: ArbitrumNetwork = {
  chainId: 333333,
  parentChainId: ChainId.ArbitrumLocal,
  confirmPeriodBlocks: 20,
  ethBridge: {
    bridge: '0xA584795e24628D9c067A6480b033C9E96281fcA3',
    inbox: '0xDcA690902d3154886Ec259308258D10EA5450996',
    outbox: '0xda243bD61B011024FC923164db75Dde198AC6175',
    rollup: '0x47b238E195b638b8972Cb3649e5d6775c279245d',
    sequencerInbox: '0x16c54EE2015CD824415c2077F4103f444E00A8cb'
  },
  isCustom: true,
  isTestnet: true,
  name: 'Nitro Testnode L3',
  tokenBridge: {
    parentCustomGateway: '0xA191D519260A06b32f8D04c84b9F457B8Caa0514',
    parentErc20Gateway: '0x6B0805Fc6e275ef66a0901D0CE68805631E271e5',
    parentGatewayRouter: '0xfE03DBdf7A126994dBd749631D7fbaB58C618c58',
    parentMultiCall: '0x20a3627Dcc53756E38aE3F92717DE9B23617b422',
    parentProxyAdmin: '0x1A61102c26ad3f64bA715B444C93388491fd8E68',
    parentWeth: '0xA1abD387192e3bb4e84D3109181F9f005aBaF5CA',
    parentWethGateway: '0x77603b0ea6a797C74Fa9ef11b5BdE04A4E03D550',
    childCustomGateway: '0xD4816AeF8f85A3C1E01Cd071a81daD4fa941625f',
    childErc20Gateway: '0xaa7d51aFFEeB32d99b1CB2fd6d81D7adA4a896e8',
    childGatewayRouter: '0x8B6BC759226f8Fe687c8aD8Cc0DbF85E095e9297',
    childMultiCall: '0x052B15c8Ff0544287AE689C4F2FC53A3905d7Db3',
    childProxyAdmin: '0x36C56eC2CF3a3f53db9F01d0A5Ae84b36fb0A1e2',
    childWeth: '0x582a8dBc77f665dF2c49Ce0a138978e9267dd968',
    childWethGateway: '0xA6AB233B3c7bfd0399834897b5073974A3D467e2'
  }
}

export const defaultL3CustomGasTokenNetwork: ArbitrumNetwork = {
  chainId: 333333,
  parentChainId: ChainId.ArbitrumLocal,
  confirmPeriodBlocks: 20,
  ethBridge: {
    bridge: '0xA584795e24628D9c067A6480b033C9E96281fcA3',
    inbox: '0xDcA690902d3154886Ec259308258D10EA5450996',
    outbox: '0xda243bD61B011024FC923164db75Dde198AC6175',
    rollup: '0x44612A67F6A7c4C894fB4AeA66c7Cfa7A0f0D388',
    sequencerInbox: '0x16c54EE2015CD824415c2077F4103f444E00A8cb'
  },
  nativeToken: '0xE069078bA9ACCE4eeAE609d8754515Cf13dd6706',
  isCustom: true,
  isTestnet: true,
  name: 'Nitro Testnode L3',
  retryableLifetimeSeconds: 604800,
  tokenBridge: {
    parentCustomGateway: '0xCe02eA568090ae7d5184B0a98df90f6aa69C1552',
    parentErc20Gateway: '0x59156b0596689D965Ba707E160e5370AF22461a0',
    parentGatewayRouter: '0x0C085152C2799834fc1603533ff6916fa1FdA302',
    parentMultiCall: '0x20a3627Dcc53756E38aE3F92717DE9B23617b422',
    parentProxyAdmin: '0x1A61102c26ad3f64bA715B444C93388491fd8E68',
    parentWeth: '0x0000000000000000000000000000000000000000',
    parentWethGateway: '0x0000000000000000000000000000000000000000',
    childCustomGateway: '0xD4816AeF8f85A3C1E01Cd071a81daD4fa941625f',
    childErc20Gateway: '0xaa7d51aFFEeB32d99b1CB2fd6d81D7adA4a896e8',
    childGatewayRouter: '0x8B6BC759226f8Fe687c8aD8Cc0DbF85E095e9297',
    childMultiCall: '0x052B15c8Ff0544287AE689C4F2FC53A3905d7Db3',
    childProxyAdmin: '0x36C56eC2CF3a3f53db9F01d0A5Ae84b36fb0A1e2',
    childWeth: '0x0000000000000000000000000000000000000000',
    childWethGateway: '0x0000000000000000000000000000000000000000'
  }
}
