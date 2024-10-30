import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { ConnectionInfo } from "ethers/lib/utils";

class LoggingProvider extends StaticJsonRpcProvider {
  perform(method: string, parameters: any): Promise<any> {
    console.log(">>>", method, parameters);
    return super.perform(method, parameters).then((result) => {
      console.log("<<<", method, parameters, result);
      return result;
    });
  }
}
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

  const provider = new LoggingProvider(connection, {
    name: chainInfo.name,
    chainId: chainInfo.chainId,
  });

  return provider;
};
