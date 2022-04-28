### Arbitrum Token Bridge Web UI


#### Local Dev Start 

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


#### Deposit Lifecycle

A Deposit is tracked via a single `Transaction` entry (in the `useTransations` hook) which represents its initiated L1 transaction; its  L2 status is tracked via the `L1ToL2MessageData` field.  


1. **Deposit is initiated** via the one of the deposit methods in `useArbTokenBridge`; its initial `L1ToL2MessageData.status` is set to `NOT_YET_CREATED`.

1. The `RetryableTxnsIncluder` regularly polls for `l1DepositsWithUntrackedL2Messages` (and finds it).
    - Note that the "normal" case for a found `l1DepositsWithUntrackedL2Messages` is one who's status is NOT_YET_CREATED; it also looks for deposits with no `L1ToL2MessageData` field at all — this is solely for backwards compatibility with cached transactions in the old UI. 

1. `fetchAndUpdateL1ToL2MsgStatus` is called; this immediately sets the L2 message's current status, and, if that status is non-terminal (i.e., NOT_YET_CREATED), it makes a call that waits for the status to return, and updates it accordingly. 
    - We track the state of whether we're currently waiting for a terminal status to return via the `fetching` field; this prevents multiple redundant/asynchronous queries from being made. Note that when we cache transactions in localStorage, we set all `fetching` fields to false (see `localStorageReducer`); i.e., if we leave a page mid-fetch, we should start fetching again upon returning to the page.

1. If a retryable fails, a very similar lifecycle to 2-3 takes place, in which we poll to see if that status has been changed (to, i.e., redeemed). See `getFailedRetryablesToRedeem` 

The `L1ToL2MessageData.l2TxID` field will be populated when/if the deposit succeeds; in the case of token deposits, this will be the execution transaction. For Eth deposits, this will be equal to the `retryableCreationTxID` (Eth deposits have no execution transaction.)

