var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { useCallback, useMemo } from 'react';
import useSWR, { useSWRConfig, unstable_serialize } from 'swr';
import { MultiCaller } from '@arbitrum/sdk';
import { useChainId } from './useChainId';
const merge = (useSWRNext) => {
    return (key, fetcher, config) => {
        const { cache } = useSWRConfig();
        const extendedFetcher = () => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            if (!fetcher) {
                return;
            }
            const newBalances = yield fetcher(key);
            const oldData = (_a = cache.get(unstable_serialize(key))) === null || _a === void 0 ? void 0 : _a.data;
            return Object.assign(Object.assign({}, (oldData || {})), newBalances);
        });
        return useSWRNext(key, extendedFetcher, config);
    };
};
const useBalance = ({ provider, walletAddress }) => {
    const chainId = useChainId({ provider });
    const walletAddressLowercased = useMemo(() => walletAddress === null || walletAddress === void 0 ? void 0 : walletAddress.toLowerCase(), [walletAddress]);
    const queryKey = useCallback((type) => {
        if (typeof chainId === 'undefined' ||
            typeof walletAddressLowercased === 'undefined') {
            // Don't fetch
            return null;
        }
        return [walletAddressLowercased, chainId, 'balance', type];
    }, [chainId, walletAddressLowercased]);
    const fetchErc20 = useCallback((_addresses) => __awaiter(void 0, void 0, void 0, function* () {
        if (typeof walletAddressLowercased === 'undefined' ||
            !(_addresses === null || _addresses === void 0 ? void 0 : _addresses.length)) {
            return {};
        }
        const multiCaller = yield MultiCaller.fromProvider(provider);
        const addressesBalances = yield multiCaller.getTokenData(_addresses, {
            balanceOf: { account: walletAddressLowercased }
        });
        return _addresses.reduce((acc, address, index) => {
            const balance = addressesBalances[index];
            if (balance) {
                acc[address.toLowerCase()] = balance.balance;
            }
            return acc;
        }, {});
    }), [provider, walletAddressLowercased]);
    const { data: dataEth = null, mutate: updateEthBalance } = useSWR(queryKey('eth'), ([_walletAddress]) => provider.getBalance(_walletAddress), {
        refreshInterval: 15000,
        shouldRetryOnError: true,
        errorRetryCount: 2,
        errorRetryInterval: 3000
    });
    const { data: dataErc20 = null, mutate: mutateErc20 } = useSWR(queryKey('erc20'), () => fetchErc20([]), {
        shouldRetryOnError: true,
        errorRetryCount: 2,
        errorRetryInterval: 3000,
        use: [merge]
    });
    const updateErc20 = useCallback((addresses) => __awaiter(void 0, void 0, void 0, function* () {
        const balances = yield fetchErc20(addresses);
        return mutateErc20(balances, {
            populateCache(result, currentData) {
                return Object.assign(Object.assign({}, currentData), result);
            },
            revalidate: false
        });
    }), [fetchErc20, mutateErc20]);
    return {
        eth: [dataEth, updateEthBalance],
        erc20: [dataErc20, updateErc20]
    };
};
export { useBalance };
