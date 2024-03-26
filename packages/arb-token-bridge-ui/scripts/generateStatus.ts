import fs from 'fs'
import axios from 'axios'

const STATUS_URL = 'https://arbitrum-internal.instatus.com/v2/components.json'

async function main() {
  const _statusSummary = (await axios.get(STATUS_URL)).data

  const resultJson =
    JSON.stringify(
      {
        meta: {
          timestamp: new Date().toISOString()
        },
        content: _statusSummary
      },
      null,
      2
    ) + '\n'

  fs.writeFileSync('./public/__auto-generated-status.json', resultJson)
}

main()
