import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { ConnectionInfo } from "ethers/lib/utils";

export const getProvider = (chainInfo: {
  rpcUrl: string;
  name: string;
  chainId: number;
}) => {
  const connection: ConnectionInfo = {
    url: chainInfo.rpcUrl,
    timeout: 30000,
    allowGzip: true,
    skipFetchSetup: true,
    throttleLimit: 3,
    throttleSlotInterval: 1000,
    headers: {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
    },
  };

  const provider = new StaticJsonRpcProvider(connection, {
    name: chainInfo.name,
    chainId: chainInfo.chainId,
  });

  return provider;
};
