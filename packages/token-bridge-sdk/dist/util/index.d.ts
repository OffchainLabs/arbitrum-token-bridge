import { TokenList } from '@uniswap/token-lists';
import { Provider } from '@ethersproject/providers';
import { EventArgs } from '@arbitrum/sdk/dist/lib/dataEntities/event';
import { L2ToL1TransactionEvent } from '@arbitrum/sdk/dist/lib/message/L2ToL1Message';
import { L2ToL1TransactionEvent as ClassicL2ToL1TransactionEvent } from '@arbitrum/sdk/dist/lib/abi/ArbSys';
import { L1TokenData, L2TokenData } from '../index';
export declare function assertNever(x: never, message?: string): never;
export declare const validateTokenList: (tokenList: TokenList) => boolean;
export declare function getDefaultTokenName(address: string): string;
export declare function getDefaultTokenSymbol(address: string): string;
/**
 * Retrieves data about an ERC-20 token using its L1 address. Throws if fails to retrieve balance or allowance.
 * @param erc20L1Address
 * @returns
 */
export declare function getL1TokenData({ account, erc20L1Address, l1Provider, l2Provider, throwOnInvalidERC20 }: {
    account: string;
    erc20L1Address: string;
    l1Provider: Provider;
    l2Provider: Provider;
    throwOnInvalidERC20?: boolean;
}): Promise<L1TokenData>;
/**
 * Retrieves data about an ERC-20 token using its L2 address. Throws if fails to retrieve balance.
 * @param erc20L2Address
 * @returns
 */
export declare function getL2TokenData({ account, erc20L2Address, l2Provider }: {
    account: string;
    erc20L2Address: string;
    l2Provider: Provider;
}): Promise<L2TokenData>;
export declare function isClassicL2ToL1TransactionEvent(event: L2ToL1TransactionEvent): event is EventArgs<ClassicL2ToL1TransactionEvent>;
