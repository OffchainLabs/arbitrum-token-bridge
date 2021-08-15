import React from 'react'
import ReactDOM from 'react-dom'
import Injecter from './components/App/Injecter'
import * as serviceWorker from './serviceWorker'
import './styles/tailwind.css'

ReactDOM.render(<Injecter />, document.getElementById('root'))

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
