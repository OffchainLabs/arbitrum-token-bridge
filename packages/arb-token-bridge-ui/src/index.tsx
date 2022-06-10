import ReactDOM from 'react-dom'

import App from './components/App/App'
import reportWebVitals from './reportWebVitals'
import { registerNitroDevnet, registerAnyTrustDevnet } from './util/networks'

import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'

import './styles/tailwind.css'

registerNitroDevnet()
registerAnyTrustDevnet()

ReactDOM.render(<App />, document.getElementById('root'))
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
