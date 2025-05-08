# RPC Configuration

This document outlines how configuring RPCs works, either through [RPC providers](#rpc-providers), or [custom RPCs](#custom-rpcs).

## RPC Providers

Two RPC providers are currently supported: [Infura](#infura) and [Alchemy](#alchemy).

Selecting which one to use is done via the following environment variable:

- `NEXT_PUBLIC_RPC_PROVIDER`

The accepted values (case insensitive) are `infura` and `alchemy`. The default is `infura`.

### Infura

The Infura key is provided through the following environment variable:

- `NEXT_PUBLIC_INFURA_KEY`

The key will be used for all chains. However, if you need to have different keys for each chain, you can do so through the following environment variables:

- `NEXT_PUBLIC_INFURA_KEY_ETHEREUM`
- `NEXT_PUBLIC_INFURA_KEY_SEPOLIA`
- `NEXT_PUBLIC_INFURA_KEY_ARBITRUM_ONE`
- `NEXT_PUBLIC_INFURA_KEY_BASE`
- `NEXT_PUBLIC_INFURA_KEY_ARBITRUM_SEPOLIA`
- `NEXT_PUBLIC_INFURA_KEY_BASE_SEPOLIA`

> [!NOTE]
> Arbitrum Nova is currently not supported on Infura, so the [public RPC](https://nova.arbitrum.io/rpc) will be used instead.

### Alchemy

The Alchemy key is provided through the following environment variable:

- `NEXT_PUBLIC_ALCHEMY_KEY`

The key will be used for all chains.

## Custom RPCs

If you need to override the RPC for a chain, you can do so through the following environment variables:

- `NEXT_PUBLIC_RPC_URL_ETHEREUM`
- `NEXT_PUBLIC_RPC_URL_SEPOLIA`
- `NEXT_PUBLIC_RPC_URL_ARBITRUM_ONE`
- `NEXT_PUBLIC_RPC_URL_ARBITRUM_NOVA`
- `NEXT_PUBLIC_RPC_URL_BASE`
- `NEXT_PUBLIC_RPC_URL_ARBITRUM_SEPOLIA`
- `NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA`

For [Nitro Testnode](https://github.com/OffchainLabs/nitro-testnode) chains:

- `NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1`
- `NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L2`
- `NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L3`
