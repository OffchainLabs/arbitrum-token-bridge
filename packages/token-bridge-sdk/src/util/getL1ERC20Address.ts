import { Provider } from '@ethersproject/providers';
import { Erc20Bridger, getL2Network } from '@arbitrum/sdk';

/**
 * Retrieves the L1 address of an ERC-20 token using its L2 address.
 * @param erc20L2Address
 * @returns
 */
async function getL1ERC20Address({
  erc20L2Address,
  l2Provider,
}: {
  erc20L2Address: string;
  l2Provider: Provider;
}): Promise<string | null> {
  try {
    const l2Network = await getL2Network(l2Provider);
    const erc20Bridger = new Erc20Bridger(l2Network);
    return await erc20Bridger.getL1ERC20Address(erc20L2Address, l2Provider);
  } catch (error) {
    return null;
  }
}

export { getL1ERC20Address };
