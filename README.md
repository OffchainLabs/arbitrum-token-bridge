# arb-token-bridge

This repository contains the source code for the [Arbitrum bridge](https://bridge.arbitrum.io/) which enables users to deposit their funds from Ethereum mainet to Arbitrum One. The bridge also enables withdrawls from Arbitrum One back to Ethereum mainnet.

## Development

This project was created with [create-react-app](https://create-react-app.dev/). Refer to their docs for advanced usage.

### Prerequisites
1. Install [Node](https://nodejs.org/en/) 14+
1. Install [yarn](https://yarnpkg.com/getting-started/install)
1. Install [Metamask](https://metamask.io/)
1. Create an Infura token
    1. Navigate to [Infura](https://infura.io) and create an account
    1. Click **Create new project** and provide a name (e.g. arb-token-bridge)
    1. Navigate to your new project and copy the project id (the part after `https://mainnet.infura.io/v3/`)

### Steps

1. Fork this repo
1. Clone your fork locally
1. Copy the sample environment variable file to a `.env` file

    ```bash
    cp .env.sample .env
    ```
1. Populate `INFURA_TOKEN` with the token generated earlier
1. Install all dependencies
    ```bash
    yarn install
    ```
1. Start the app in development mode on port 3000
    ```bash
    yarn start
    ```
1. Navigate to [http://localhost:3000/](http://localhost:3000/).
1. The app will ask to connect to your Metamask
1. The changes you make locally should live-reload in the app.
