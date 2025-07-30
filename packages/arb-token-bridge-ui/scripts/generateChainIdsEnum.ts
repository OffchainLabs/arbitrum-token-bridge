import fs from 'fs'
import path from 'path'

interface OrbitChainData {
  chainId: number
  name: string
  isTestnet: boolean
}

interface OrbitChainsData {
  mainnet: OrbitChainData[]
  testnet: OrbitChainData[]
}

function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(word => word.length > 0)
    .map((word, index) => {
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join('')
}

function generateChainIdsEnum(): void {
  const orbitChainsDataPath = path.join(__dirname, '../src/util/orbitChainsData.json')
  const chainIdTypesPath = path.join(__dirname, '../src/types/ChainId.ts')
  
  const orbitChainsData: OrbitChainsData = JSON.parse(
    fs.readFileSync(orbitChainsDataPath, 'utf8')
  )
  
  const defaultChains = `  // L1
  Ethereum = 1,
  // L1 Testnets
  Local = 1337,
  Sepolia = 11155111,
  // L2
  ArbitrumOne = 42161,
  ArbitrumNova = 42170,
  Base = 8453,
  // L2 Testnets
  ArbitrumSepolia = 421614,
  ArbitrumLocal = 412346,
  BaseSepolia = 84532,
  // L3 Testnets
  L3Local = 333333,`
  
  const allChains = [...orbitChainsData.mainnet, ...orbitChainsData.testnet]
  
  const orbitChainEntries = allChains.map(chain => {
    const enumKey = toCamelCase(chain.name)
    return `  ${enumKey} = ${chain.chainId},`
  }).join('\n')
  
  const newEnumContent = `export enum ChainId {
${defaultChains}
  // Orbit Chains
${orbitChainEntries}
}`
  
  const newContent = newEnumContent
  
  fs.writeFileSync(chainIdTypesPath, newContent)
  
  console.log('✅ ChainId enum updated with orbit chain IDs')
  console.log(`Added ${allChains.length} orbit chains to the enum`)
}

if (require.main === module) {
  generateChainIdsEnum()
}

export default generateChainIdsEnum