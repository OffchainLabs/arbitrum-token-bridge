# [Arbitrum Token Bridge](https://bridge.arbitrum.io/)

### The canonical token-bridge of [Arbitrum](https://arbitrum.io/)

Are you a developer looking to explore the Arbitrum token bridge and its underlying technology? Then you've come to the right place! We'll walk you through the steps to run the Arbitrum token bridge website locally on your machine.

<br />

Arbitrum ❤️ Open-source

Interested in contributing to this repo? We welcome your contribution.
[Check out the contribution guidelines and instructions here](CONTRIBUTING.md).

<br />

---

<br />

## Prerequisites for running the code

- Install [Node.js](https://nodejs.org/en/download/) for your platform
- Install [Node Version Manager (nvm)](https://www.freecodecamp.org/news/node-version-manager-nvm-install-guide/) to setup the correct Node version for the project.
- Install [VS Code](https://code.visualstudio.com/download) for your platform
- Install [Yarn (version 1)](https://classic.yarnpkg.com) - Package manager

- Within VS Code, we use a some tools to automate things (e.g. code formatting), maintain consistency and reduce noise for code reviews. For the optimal development experience, install the following tools:

  - [Prettier](https://prettier.io) - Automatic code formatting
    - Find Prettier integration for your code editor [here](https://prettier.io/docs/en/editors.html)
  - [EditorConfig](https://editorconfig.org) - Automatic file formatting
    - Find EditorConfig integration for your code editor [here](https://editorconfig.org/#download)
  - [ESLint](https://eslint.org) - Static analysis for JavaScript
    - Find ESLint integration for your code editor [here](https://eslint.org/docs/latest/user-guide/integrations#editors)

<br />

---

<br />

## Steps to run the code locally

1. Clone the Arbitrum token bridge repository from Github onto your local machine

   ```bash
   $ git clone https://github.com/OffchainLabs/arb-token-bridge
   ```

2. Use the Node version as per project settings to avoid any errors before project installation.

   ```bash
   $ nvm use
   ```

3. Install dependencies in all packages using yarn.

   ```bash
   $ yarn
   ```

4. Set env vars:

   1. Copy the existing env.sample file present.

      ```bash
      $ cp ./packages/arb-token-bridge-ui/.env.local.sample  ./packages/arb-token-bridge-ui/.env
      ```

   2. In `.env` created, add `NEXT_PUBLIC_INFURA_KEY=my-infura-key`

   3. For custom urls, set optional vars:

   - `NEXT_PUBLIC_ETHEREUM_RPC_URL=my-eth-node`
   - `NEXT_PUBLIC_GOERLI_RPC_URL=my-goerli-node`
     (see [.env.sample](./packages/arb-token-bridge-ui/.env.sample))
     If no custom URL is provided, Infura will be used by default.

5. Build the project and internal packages

   ```bash
   $ yarn build
   ```

6. Finally, running the project

   1. (back in root dir:)

      ```bash
      $ yarn dev
      ```

   2. Visit `http://localhost:3000/`

<br />

---

<br />

## Testing changes

It is important for any code change to pass both unit and end-to-end tests. This is generally done before raising the PR to ensure it doesn't break any existing feature.

<br />

### Run Unit Tests

1. Run the token bridge UI locally on `http://localhost:3000/`
2. Run the tests
   ```bash
   $ yarn test:ci
   ```

<br />

### Run End-to-End (E2E) Tests

1. Run the token bridge UI locally on `http://localhost:3000/`

2. Set env vars (one time):

   1. At this folder's root,

      ```bash
      $ cp ./packages/arb-token-bridge-ui/.e2e.env.sample ./packages/arb-token-bridge-ui/.e2e.env
      ```

   2. In the newly created file, `.e2e.env`, update your `NEXT_PUBLIC_INFURA_KEY, PRIVATE_KEY_USER, etc` in the format mentioned in the file.

3. Run e2e tests
   ```bash
   $ yarn test:e2e
   ```

Read more about the test setup [here](/packages/arb-token-bridge-ui/tests/e2e/README.md).

<br />

---

<br />
