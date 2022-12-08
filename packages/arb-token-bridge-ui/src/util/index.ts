import { utils } from 'ethers'

export enum ConnectionState {
  LOADING,
  L1_CONNECTED,
  L2_CONNECTED,
  SEQUENCER_UPDATE,
  NETWORK_ERROR
}

export enum AccountType {
  EOA,
  SMART_CONTRACT_WALLET
}

export enum PendingWithdrawalsLoadedState {
  LOADING,
  READY,
  ERROR
}

export const gnosisInterface = new utils.Interface([
  'function getOwners() view returns (address[])'
])

export const sanitizeImageSrc = (url: string): string => {
  if (url.startsWith('ipfs')) {
    return `https://ipfs.io/ipfs/${url.substring(7)}`
  }

  return url
}

export function preloadImages(imageSources: string[]) {
  imageSources.forEach(imageSrc => {
    const image = new Image()
    image.src = imageSrc
  })
}
