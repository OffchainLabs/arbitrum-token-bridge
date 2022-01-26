### Arbitrum Token Bridge Web UI


##### Local Dev Start 

1. `git clone https://github.com/OffchainLabs/arb-token-bridge`

1. `cd ./arb-token-bridge && yarn install`

1. Set infura key:

    1. `touch ./packages/arb-token-bridge-ui/.env`

    1. In `.env`, add `REACT_APP_INFURA_KEY=my-infura-key`

    1.  (to use other rpc endpoint, set in `packages/arb-token-bridge-ui/src/util/networks.ts`)

1. (back in root dir:) `yarn start_sdk`

1. Open new terminal tab

1. `yarn start_ui`

1. Visit `http://localhost:3000/`

