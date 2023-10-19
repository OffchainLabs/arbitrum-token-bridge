import { react, fetch } from '@wagmi/cli/plugins'
import { defineConfig } from '@wagmi/cli'

import { getRequestUrl } from './src/util/fetchAbi'

const NODE_INTERFACE_ADDRESS = '0x00000000000000000000000000000000000000C8'

export default defineConfig({
  out: 'src/generated.ts',
  contracts: [],
  plugins: [
    fetch({
      request() {
        // Node Interface is the same on every Arb chain
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
