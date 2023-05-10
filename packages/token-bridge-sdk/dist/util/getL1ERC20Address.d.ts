import { Provider } from '@ethersproject/providers';
/**
 * Retrieves the L1 address of an ERC-20 token using its L2 address.
 * @param erc20L2Address
 * @returns
 */
declare function getL1ERC20Address({ erc20L2Address, l2Provider }: {
    erc20L2Address: string;
    l2Provider: Provider;
}): Promise<string | null>;
export { getL1ERC20Address };
