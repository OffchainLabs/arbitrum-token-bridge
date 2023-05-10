import { BigNumber } from 'ethers';
import { Provider } from '@ethersproject/abstract-provider';
type Erc20Balances = {
    [address: string]: BigNumber | undefined;
};
declare const useBalance: ({ provider, walletAddress }: {
    provider: Provider;
    walletAddress: string | undefined;
}) => {
    eth: readonly [BigNumber | null, import("swr/_internal").KeyedMutator<BigNumber>];
    erc20: readonly [Erc20Balances | null, (addresses: string[]) => Promise<Erc20Balances | undefined>];
};
export { useBalance };
