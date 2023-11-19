import { NonCanonicalTokensBridgeInfo } from '../../../util/fastBridges'

export const isNonCanonicalToken = (selectedTokenAddress: string) => {
  if (selectedTokenAddress) {
    return Object.keys(NonCanonicalTokensBridgeInfo)
      .map(key => key.toLowerCase())
      .includes(selectedTokenAddress.toLowerCase())
  }
  return false
}
