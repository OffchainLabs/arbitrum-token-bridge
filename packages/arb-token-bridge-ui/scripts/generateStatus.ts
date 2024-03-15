import fs from 'fs'
import axios from 'axios'

const STATUS_URL = 'https://status.arbitrum.io/summary.json'

async function main() {
  const _statusSummary = (await axios.get(STATUS_URL)).data
  // status is of the following format: https://status.arbitrum.io/public-api

  // example - to be removed later
  const hardcodedStatus = {
    page: {
      name: 'Arbitrum',
      url: 'https://status.arbitrum.io',
      status: 'UP'
    },
    activeIncidents: [
      {
        name: "We're facing an issue with our API",
        started:
          'Sat Jun 11 2022 18:55:50 GMT+0000 (Coordinated Universal Time)',
        status: 'INVESTIGATING',
        impact: 'MAJOROUTAGE',
        url: '_some_url'
      }
    ],
    activeMaintenances: [
      {
        name: 'Database maintenance',
        start: 'Sat Jun 11 2022 18:55:54 GMT+0000 (Coordinated Universal Time)',
        status: 'NOTSTARTEDYET',
        duration: '60',
        url: '_some_url'
      }
    ]
  }

  const resultJson =
    JSON.stringify(
      {
        meta: {
          timestamp: new Date().toISOString()
        },
        content: hardcodedStatus
      },
      null,
      2
    ) + '\n'

  fs.writeFileSync('./public/__auto-generated-status.json', resultJson)
}

main()
