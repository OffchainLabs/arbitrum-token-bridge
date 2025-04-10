export function getWarningTokenDescription(warningTokenType: number) {
  switch (warningTokenType) {
    case 0:
      return 'a supply rebasing token'
    case 1:
      return 'an interest accruing token'
    default:
      return 'a non-standard ERC20 token'
  }
}
