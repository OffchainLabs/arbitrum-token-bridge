import { react, fetch } from '@wagmi/cli/plugins'
import { defineConfig } from '@wagmi/cli'

const NODE_INTERFACE_ADDRESS = '0x00000000000000000000000000000000000000C8'

function getRequestUrl(address: `0x${string}`) {
  return `https://api.arbiscan.io/api?module=contract&action=getabi&format=raw&address=${address}`
}

export default defineConfig({
  out: 'src/generated.ts',
  contracts: [],
  plugins: [
    fetch({
      request() {
        // Node Interface is the same on every Arb chain so we can use Arb One
        return { url: getRequestUrl(NODE_INTERFACE_ADDRESS) }
      },
      contracts: [
        {
          name: 'NodeInterface',
          address: NODE_INTERFACE_ADDRESS
        }
      ],
      cacheDuration: 0
    }),
    react()
  ]
})
