import axios from 'axios'
import { getWarningTokenDescription } from '../../../components/TransferPanel/TransferPanelUtils'
import { DOCS_DOMAIN } from '../../../constants'

const warningTokensUrl =
  'https://raw.githubusercontent.com/OffchainLabs/arb-token-lists/aff40a59608678cfd9b034dd198011c90b65b8b6/src/WarningList/warningTokens.json'

export const checkForWarningTokens = async (
  selectedErc20ContractAddress: string
) => {
  try {
    // todo: later set this in local or session storage maybe?
    const warningTokens = (await axios.get(warningTokensUrl)).data

    const warningToken =
      selectedErc20ContractAddress &&
      warningTokens[selectedErc20ContractAddress.toLowerCase()]

    if (warningToken) {
      const description = getWarningTokenDescription(warningToken.type)
      return `${selectedErc20ContractAddress} is ${description}; it will likely have unusual behavior when deployed as as standard token to Arbitrum. It is not recommended that you deploy it. (See ${DOCS_DOMAIN}/for-devs/concepts/token-bridge/token-bridge-erc20 for more info.)`
    } else {
      // no warning. continue...
    }
  } catch (e) {
    console.warn('Failed to fetch warning tokens:', e)
  }
}
