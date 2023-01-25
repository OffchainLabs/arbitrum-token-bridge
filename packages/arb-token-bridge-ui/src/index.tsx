import ReactDOM from 'react-dom'
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import App from './components/App/App'
import reportWebVitals from './reportWebVitals'
import { registerLocalNetwork } from './util/networks'

import Package from '../package.json'

import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'

import './styles/tailwind.css'

if (process.env.NODE_ENV === 'development') {
  registerLocalNetwork()
}

dayjs.extend(relativeTime)

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  release: Package.version,
  integrations: [new BrowserTracing()],
  tracesSampleRate: 0.15,
  beforeSend: event => {
    if (event.message) {
      if (
        // Ignore events related to failed `eth_gasPrice` calls
        event.message.match(/eth_gasPrice/i) ||
        // Ignore events related to failed `eth_getBalance` calls
        event.message.match(/eth_getBalance/i)
      ) {
        return null
      }
    }

    return event
  }
})

ReactDOM.render(<App />, document.getElementById('root'))
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
