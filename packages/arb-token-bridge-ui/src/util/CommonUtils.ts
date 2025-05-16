let localStoragePromise = Promise.resolve()

export function addToLocalStorageObjectSequentially({
  localStorageKey,
  localStorageValue
}: {
  localStorageKey: string
  localStorageValue: Record<string, string | number | boolean>
}) {
  localStoragePromise = localStoragePromise.then(() => {
    const localStorageItem = localStorage.getItem(localStorageKey)

    localStorage.setItem(
      localStorageKey,
      JSON.stringify({
        ...JSON.parse(localStorageItem ?? '{}'),
        ...localStorageValue
      })
    )
  })
}

export function shortenAddress(address: string) {
  const addressLength = address.length

  return `${address.substring(0, 5)}...${address.substring(
    addressLength - 4,
    addressLength
  )}`
}

export function shortenTxHash(txHash: string) {
  const txHashLength = txHash.length

  return `${txHash.substring(0, 7)}...${txHash.substring(
    txHashLength - 4,
    txHashLength
  )}`
}

export const isE2eTestingEnvironment =
  (typeof window !== 'undefined' && !!window.Cypress) ||
  process.env.NEXT_PUBLIC_IS_E2E_TEST === 'true'

export const isDevelopmentEnvironment = process.env.NODE_ENV === 'development'

export const isProductionEnvironment = process.env.NODE_ENV === 'production'
