import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { TokenList } from '@uniswap/token-lists'
import { getArbitrumNetworks } from '@arbitrum/sdk'

const tokenListsUrls = [
  'https://tokenlist.arbitrum.io/ArbTokenLists/arbitrum_token_token_list.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs_default.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coingecko.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs_default.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_coingecko.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/421613_arbed_coinmarketcap.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/421613_arbed_coingecko.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_uniswap_labs.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_coingecko.json',
  'https://tokenlist.arbitrum.io/ArbTokenLists/660279_arbed_uniswap_labs.json'
]

// denylisted destination addresses in order: One, Nova, Sepolia
// https://docs.arbitrum.io/for-devs/useful-addresses
const DESTINATION_ADDRESS_DENYLIST = [
  // Protocol (L1)
  // ChallengeManager
  '0xe5896783a2F463446E1f624e64Aa6836BE4C6f58',
  '0xA59075221b50C598aED0Eae0bB9869639513af0D',
  '0x84EDD049A8a54fB6ED6c239Ad46f5B021F150700',
  // OneStepProver0
  '0x499A4f574f2e4F8837E242adEc86223Ef7DeEfcC',
  '0x8323B58C522690E6aFae94044825F0c79A93d236',
  '0xAF57ce898670D8fb4BEa8d3C37E22CbA01B70ddA',
  // OneStepProverMemory
  '0xb556F3Bb0FdCFeAf81a1c393e024a69a3327B676',
  '0x7a6C0503107858f82a790E481024134092e19979',
  '0xA6Aca7d478e5236868bd8C8fD95B061685CBf0c5',
  // OneStepProverMath
  '0xd315Ac3a82E8EDAA84b347F478e0F59801747970',
  '0x1efb116EBC38CE895Eb2E5e009234E0E0836f2F5',
  '0xfEe5c93D21b1b036eD6C250ca08F274a1a7d42F4',
  // OneStepProverHostIo
  '0xb965b08A826D4C7634e0Df4c5eF5E1d1f9b5D13A',
  '0x9CBC3F14a57CE6eAD0e770F528E2f1E8b8C37613',
  '0xA53aA7d75C6672d774D4229c3cCf1F79870B752a',
  // OneStepProofEntry
  '0x3E1f62AA8076000c3218493FE3e0Ae40bcB9A1DF',
  '0x7AdcA86896c4220f19B2f7f9746e7A99E57B0Fc5',
  '0x08a289543e8e3423db585DcFF8fa0a6E4b515961',
  // CoreProxyAdmin
  '0x554723262467F125Ac9e1cDFa9Ce15cc53822dbD',
  '0x71D78dC7cCC0e037e12de1E50f5470903ce37148',
  '0x1ed74a4e4F4C42b86A7002e9951e98DBcC890686',
  //
  // L1 Dai Gateway
  '0xD3B5b60020504bc3489D6949d545893982BA3011',
  // L2 Dai Gateway
  '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65',
  // L1 Livepeer Gateway
  '0x6142f1C8bBF02E6A6bd074E8d564c9A5420a0676',
  // L2 Livepeer Gateway
  '0x6D2457a4ad276000A615295f7A80F79E48CcD318',
  //
  // Arbitrum Precompiles (L2, same on all Arb-chains)
  // ArbSys
  '0x0000000000000000000000000000000000000064',
  // ArbRetryableTx
  '0x000000000000000000000000000000000000006E',
  // ArbGasInfo
  '0x000000000000000000000000000000000000006C',
  // ArbAddressTable
  '0x0000000000000000000000000000000000000066',
  // ArbStatistics
  '0x000000000000000000000000000000000000006F',
  // NodeInterface
  '0x00000000000000000000000000000000000000C8',
  // ArbBLS
  '0x0000000000000000000000000000000000000067',
  // ArbInfo
  '0x0000000000000000000000000000000000000065',
  // ArbAggregator
  '0x000000000000000000000000000000000000006D',
  // ArbFunctionTable
  '0x0000000000000000000000000000000000000068',
  //
  // Validators
  // Ethereum Mainnet: Arbitrum One
  '0x0fF813f6BD577c3D1cDbE435baC0621BE6aE34B4',
  '0x54c0D3d6C101580dB3be8763A2aE2c6bb9dc840c',
  '0x56D83349c2B8DCF74d7E92D5b6B33d0BADD52D78',
  '0x610Aa279989F440820e14248BD3879B148717974',
  '0x6Fb914de4653eC5592B7c15F4d9466Cbd03F2104',
  '0x758C6bB08B3ea5889B5cddbdeF9A45b3a983c398',
  '0x7CF3d537733F6Ba4183A833c9B021265716cE9d0',
  '0x83215480dB2C6A7E56f9E99EF93AB9B36F8A3DD5',
  '0xAB1A39332e934300eBCc57B5f95cA90631a347FF',
  '0xB0CB1384e3f4a9a9b2447e39b05e10631E1D34B0',
  '0xF8D3E1cF58386c92B27710C6a0D8A54c76BC6ab5',
  '0xdDf2F71Ab206C0138A8eceEb54386567D5abF01E',
  '0xf59caf75e8A4bFBA4e6e07aD86C7E498E4d2519b',
  // Ethereum Mainnet: Arbitrum Nova
  '0x1732BE6738117e9d22A84181AF68C8d09Cd4FF23',
  '0x24Ca61c31C7f9Af3ab104dB6B9A444F28e9071e3',
  '0x3B0369CAD35d257793F51c28213a4Cf4001397AC',
  '0x54c0D3d6C101580dB3be8763A2aE2c6bb9dc840c',
  '0x57004b440Cc4eb2FEd8c4d1865FaC907F9150C76',
  '0x658e8123722462F888b6fa01a7dbcEFe1D6DD709',
  '0xDfB23DFE9De7dcC974467195C8B7D5cd21C9d7cB',
  '0xE27d4Ed355e5273A3D4855c8e11BC4a8d3e39b87',
  '0xB51EDdfc9A945e2B909905e4F242C4796Ac0C61d',
  // Testnet: Sepolia
  '0x8a8f0a24d7e58a76FC8F77bb68C7c902b91e182e',
  '0x87630025E63A30eCf9Ca9d580d9D95922Fea6aF0'
]

async function main() {
  const promises = tokenListsUrls.map(url => axios.get<TokenList>(url))
  const tokenLists = (await Promise.all(promises)).map(res => res.data)
  const allTokens = tokenLists.map(list => list.tokens).flat()
  const allTokenAddresses = [...new Set(allTokens.map(token => token.address))]

  const denylistedAddresses = [
    ...DESTINATION_ADDRESS_DENYLIST,
    ...allTokenAddresses
  ]

  getArbitrumNetworks().map(arbitrumNetwork => {
    const { ethBridge, tokenBridge } = arbitrumNetwork
    const { classicOutboxes } = ethBridge

    if (classicOutboxes) {
      denylistedAddresses.push(...Object.keys(classicOutboxes))
    }

    delete ethBridge.classicOutboxes
    denylistedAddresses.push(...Object.values(ethBridge))

    if (tokenBridge) {
      denylistedAddresses.push(...Object.values(tokenBridge))
    }
  })

  const resultJson =
    JSON.stringify(
      {
        meta: {
          timestamp: new Date().toISOString()
        },
        content: [
          ...new Set(denylistedAddresses.map(address => address.toLowerCase()))
        ]
      },
      null,
      2
    ) + '\n'

  fs.writeFileSync(
    path.join(__dirname, '../../app/public/__auto-generated-denylist.json'),
    resultJson
  )
}

main()
