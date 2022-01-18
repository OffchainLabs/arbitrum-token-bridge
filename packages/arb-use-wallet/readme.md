### NOTE: forked from https://github.com/gimmixorg/use-wallet (@ commit d1cb8a2e30b0cbc208850116b372b4e7956fc509)

# ✵ useWallet ✵

An easy-to-integrate React hook for connecting and interacting with a Web 3 wallet.

Uses [Web3Modal](https://github.com/Web3Modal/web3modal) and [Zustand](https://github.com/pmndrs/zustand).

### Example Connect / Disconnect button

```
const ConnectWalletButton = () => {
  const { account, connect, disconnect } = useWallet();
  return <>
      {!account ? (
        <button onClick={() => connect()}>Connect Wallet</button>
      ) : (
        <button onClick={() => disconnect()}>Disconnect Wallet</button>
      )}
    </>;
}
```

The `connect` function passes along an optional config to a [Web3Modal instance for additional customization](https://github.com/Web3Modal/web3modal#usage).

You can use the account information from useWallet anywhere inside your React app, without any extra set up.

```
const UserAddress = () => {
  const { account } = useWallet();
  if (!account) return null;
  return <>{account}</>;
}

```

To run a transaction or sign a message, use the `provider` object returned by the hook for connected wallets. This is a standard [Ethers.js Provider](https://docs.ethers.io/v5/api/providers/provider/).

```
const SignMessageButton = () => {
  const { account, provider } = useWallet();
  if (!account) return null;
  const signMessage = async () => {
    const signature = await provider.getSigner().signMessage("Hello!");
    console.log(signature);
  }
  return <button onClick={signMessage}>Sign Message</>;
}

```
