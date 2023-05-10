var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { schema } from '@uniswap/token-lists';
import { BigNumber, constants } from 'ethers';
import { Erc20Bridger, MultiCaller } from '@arbitrum/sdk';
import { StandardArbERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/StandardArbERC20__factory';
import { ERC20__factory } from '../index';
export function assertNever(x, message = 'Unexpected object') {
    console.error(message, x);
    throw new Error('see console ' + message);
}
export const validateTokenList = (tokenList) => {
    const ajv = new Ajv();
    addFormats(ajv);
    const validate = ajv.compile(schema);
    return validate(tokenList);
};
export function getDefaultTokenName(address) {
    const lowercased = address.toLowerCase();
    return (lowercased.substring(0, 5) +
        '...' +
        lowercased.substring(lowercased.length - 3));
}
export function getDefaultTokenSymbol(address) {
    const lowercased = address.toLowerCase();
    return (lowercased.substring(0, 5) +
        '...' +
        lowercased.substring(lowercased.length - 3));
}
/**
 * Retrieves data about an ERC-20 token using its L1 address. Throws if fails to retrieve balance or allowance.
 * @param erc20L1Address
 * @returns
 */
export function getL1TokenData({ account, erc20L1Address, l1Provider, l2Provider, throwOnInvalidERC20 = true }) {
    var _a, _b, _c, _d, _e;
    return __awaiter(this, void 0, void 0, function* () {
        // caching for tokens results
        const l1TokenDataCache = JSON.parse(sessionStorage.getItem('l1TokenDataCache') || '{}');
        const cachedTokenData = l1TokenDataCache === null || l1TokenDataCache === void 0 ? void 0 : l1TokenDataCache[erc20L1Address];
        if (cachedTokenData)
            // successfully found the cache for the required token
            return Object.assign(Object.assign({}, cachedTokenData), { allowance: BigNumber.from(cachedTokenData.allowance || 0) // return allowance in a bignumber format, which would've been flattened by sessionStorage
             });
        const erc20Bridger = yield Erc20Bridger.fromProvider(l2Provider);
        const l1GatewayAddress = yield erc20Bridger.getL1GatewayAddress(erc20L1Address, l1Provider);
        const contract = ERC20__factory.connect(erc20L1Address, l1Provider);
        const multiCaller = yield MultiCaller.fromProvider(l1Provider);
        const [tokenData] = yield multiCaller.getTokenData([erc20L1Address], {
            balanceOf: { account },
            allowance: { owner: account, spender: l1GatewayAddress },
            decimals: true,
            name: true,
            symbol: true
        });
        let shouldCache = true;
        if (tokenData && typeof tokenData.balance === 'undefined') {
            shouldCache = false;
            if (throwOnInvalidERC20)
                throw new Error(`getL1TokenData: No balance method available for ${erc20L1Address}`);
        }
        if (tokenData && typeof tokenData.allowance === 'undefined') {
            shouldCache = false;
            if (throwOnInvalidERC20)
                throw new Error(`getL1TokenData: No allowance method available for ${erc20L1Address}`);
        }
        const finalTokenData = {
            name: (_a = tokenData === null || tokenData === void 0 ? void 0 : tokenData.name) !== null && _a !== void 0 ? _a : getDefaultTokenName(erc20L1Address),
            symbol: (_b = tokenData === null || tokenData === void 0 ? void 0 : tokenData.symbol) !== null && _b !== void 0 ? _b : getDefaultTokenSymbol(erc20L1Address),
            balance: (_c = tokenData === null || tokenData === void 0 ? void 0 : tokenData.balance) !== null && _c !== void 0 ? _c : constants.Zero,
            allowance: (_d = tokenData === null || tokenData === void 0 ? void 0 : tokenData.allowance) !== null && _d !== void 0 ? _d : constants.Zero,
            decimals: (_e = tokenData === null || tokenData === void 0 ? void 0 : tokenData.decimals) !== null && _e !== void 0 ? _e : 0,
            contract
        };
        // store the newly fetched final-token-data in cache
        try {
            l1TokenDataCache[erc20L1Address] = finalTokenData;
            // only cache the token data if there were no errors in fetching it
            if (shouldCache) {
                sessionStorage.setItem('l1TokenDataCache', JSON.stringify(l1TokenDataCache));
            }
        }
        catch (e) {
            console.warn(e);
        }
        return finalTokenData;
    });
}
/**
 * Retrieves data about an ERC-20 token using its L2 address. Throws if fails to retrieve balance.
 * @param erc20L2Address
 * @returns
 */
export function getL2TokenData({ account, erc20L2Address, l2Provider }) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const contract = StandardArbERC20__factory.connect(erc20L2Address, l2Provider);
        const multiCaller = yield MultiCaller.fromProvider(l2Provider);
        const [tokenData] = yield multiCaller.getTokenData([erc20L2Address], {
            balanceOf: { account }
        });
        if (tokenData && typeof tokenData.balance === 'undefined') {
            throw new Error(`getL2TokenData: No balance method available for ${erc20L2Address}`);
        }
        return {
            balance: (_a = tokenData === null || tokenData === void 0 ? void 0 : tokenData.balance) !== null && _a !== void 0 ? _a : constants.Zero,
            contract
        };
    });
}
export function isClassicL2ToL1TransactionEvent(event) {
    return typeof event.batchNumber !== 'undefined';
}
