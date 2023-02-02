import { BigNumber } from 'ethers';
import { L2ToL1EventResult } from '../hooks/arbTokenBridge.types';

export function getUniqueIdOrHashFromEvent(
  event: L2ToL1EventResult,
): BigNumber {
  const anyEvent = event as any;

  // Nitro
  if (anyEvent.hash) {
    return anyEvent.hash as BigNumber;
  }

  // Classic
  return anyEvent.uniqueId as BigNumber;
}
