export function getRequestUrl(address: `0x${string}`) {
  return `https://api.arbiscan.io/api?module=contract&action=getabi&format=raw&address=${address}`
}

export async function fetchAbiFromArbiscan(url: string) {
  const response = await fetch(url)
  const responseJson = await response.json()

  return responseJson
}

export async function fetchAbi(address: `0x${string}`) {
  const requestUrl = getRequestUrl(address)

  return fetchAbiFromArbiscan(requestUrl)
}
