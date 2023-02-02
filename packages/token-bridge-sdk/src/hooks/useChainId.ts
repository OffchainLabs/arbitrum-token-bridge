import { useState, useEffect } from 'react';
import { providers } from 'ethers';

export function useChainId({ provider }: { provider: providers.Provider }) {
  const [chainId, setChainId] = useState<number | undefined>(undefined);

  useEffect(() => {
    async function updateChainId() {
      setChainId((await provider.getNetwork()).chainId);
    }

    updateChainId();
  }, [provider]);

  return chainId;
}
