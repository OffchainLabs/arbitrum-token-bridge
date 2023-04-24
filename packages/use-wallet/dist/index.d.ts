import Web3Modal, { ICoreOptions } from 'web3modal';
import { Network, Web3Provider } from '@ethersproject/providers';
type State = {
    provider: Web3Provider;
    account: Account;
    network: Network;
    web3Modal: Web3Modal;
};
type Account = string;
type ConnectWallet = (opts?: Partial<ICoreOptions>) => Promise<State>;
type DisconnectWallet = () => void;
type UseWallet = () => Partial<State> & {
    connect: ConnectWallet;
    disconnect: DisconnectWallet;
};
export declare const useWallet: UseWallet;
export {};
