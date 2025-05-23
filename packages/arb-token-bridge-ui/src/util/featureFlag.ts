export function isLifiEnabled() {
  return process.env.NEXT_PUBLIC_FEATURE_FLAG_LIFI === 'true'
}
