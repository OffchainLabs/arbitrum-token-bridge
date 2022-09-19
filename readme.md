# Arbitrum Token Bridge Web UI

## Run Locally

1. `git clone https://github.com/OffchainLabs/arb-token-bridge`

2. `cd ./arb-token-bridge && yarn install`

3. `cd ./packages/use-wallet && yarn build`

4. Set env vars:

   1. `touch ./packages/arb-token-bridge-ui/.env`

   2. In `.env`, add `REACT_APP_INFURA_KEY=my-infura-key`

   3. For custom urls, set optional vars:

   - `REACT_APP_ETHEREUM_RPC_URL=my-eth-node`
   - `REACT_APP_RINKEBY_RPC_URL=my-rinkeby-node`
   - `REACT_APP_GOERLI_RPC_URL=my-goerli-node`
     (see [.env.sample](./packages/arb-token-bridge-ui/.env.sample))
     If no custom URL is provided, Infura will be used by default.

#### Dev Build

1. (back in root dir:) `yarn start_sdk`

2. Open new terminal tab

3. `yarn start_ui`

4. Visit `http://localhost:3000/`

#### Local Production Build

1. install `serve`: `npm install -g serve`
2. (back in root dir:) `yarn build`
3. `yarn serve`

#### Run End-to-End Tests

1. Run the token bridge UI locally

2. Set env vars:

   1. At this repository's root, `touch ./packages/arb-token-bridge-ui/.e2e.env`

   2. In `.e2e-env`, add `SECRET_WORDS="your, seed, phrase, for, your, e2e, test, metamask, extension"`

3. `cd ./packages/arb-token-bridge-ui/ && yarn e2e:run`

Read more about the setup [here](/packages/arb-token-bridge-ui/tests/e2e/README.md).

### Development Tools

We use a couple of tools to automate things (e.g. code formatting), maintain consistency and reduce noise for code reviews. For the optimal development experience, install the following tools:

- [Yarn](https://classic.yarnpkg.com) - Package manager
  - Find Yarn install guide for your system [here](https://classic.yarnpkg.com/en/docs/install)
- [Prettier](https://prettier.io) - Automatic code formatting
  - Find Prettier integration for your code editor [here](https://prettier.io/docs/en/editors.html)
- [EditorConfig](https://editorconfig.org) - Automatic file formatting
  - Find EditorConfig integration for your code editor [here](https://editorconfig.org/#download)
- [ESLint](https://eslint.org) - Static analysis for JavaScript
  - Find ESLint integration for your code editor [here](https://eslint.org/docs/latest/user-guide/integrations#editors)

### Deposit Lifecycle

A Deposit is tracked via a single `Transaction` entry (in the `useTransactions` hook) which represents its initiated L1 transaction; its L2 status is tracked via the `L1ToL2MessageData` field.

1. **Deposit is initiated** via one of the deposit methods in `useArbTokenBridge`; its initial `L1ToL2MessageData.status` is set to `NOT_YET_CREATED`.

2. The `RetryableTxnsIncluder` regularly polls for `l1DepositsWithUntrackedL2Messages` (and finds it).

   - Note that the "normal" case for a found `l1DepositsWithUntrackedL2Messages` is one whose status is `NOT_YET_CREATED`; it also looks for deposits with no `L1ToL2MessageData` field at all — this is solely for backwards compatibility with cached transactions in the old UI.

3. `fetchAndUpdateL1ToL2MsgStatus` is called; this immediately sets the L2 message's current status, and, if that status is non-terminal (i.e., `NOT_YET_CREATED`), it makes a call that waits for the status to return, and updates it accordingly.

   - We track the state of whether we're currently waiting for a terminal status to return via the `fetching` field; this prevents multiple redundant/asynchronous queries from being made. Note that when we cache transactions in localStorage, we set all `fetching` fields to false (see `localStorageReducer`); i.e., if we leave a page mid-fetch, we should start fetching again upon returning to the page.

4. If a retryable fails, a very similar lifecycle to 2-3 takes place, in which we poll to see if that status has been changed (to, i.e., redeemed). See `getFailedRetryablesToRedeem`.

The `L1ToL2MessageData.l2TxID` field will be populated when/if the deposit succeeds; in the case of token deposits, this will be the execution transaction. For Eth deposits, this will be equal to the `retryableCreationTxID` (Eth deposits have no execution transaction.)
