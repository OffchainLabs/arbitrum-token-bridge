var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Erc20Bridger } from '@arbitrum/sdk';
/**
 * Retrieves the L1 address of an ERC-20 token using its L2 address.
 * @param erc20L2Address
 * @returns
 */
function getL1ERC20Address({ erc20L2Address, l2Provider }) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const erc20Bridger = yield Erc20Bridger.fromProvider(l2Provider);
            return yield erc20Bridger.getL1ERC20Address(erc20L2Address, l2Provider);
        }
        catch (error) {
            return null;
        }
    });
}
export { getL1ERC20Address };
