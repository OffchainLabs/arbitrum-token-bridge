import {
    ApolloClient,
    InMemoryCache,
    ApolloProvider,
    gql
  } from "@apollo/client";
import { BigNumber } from "@ethersproject/bignumber";

  const appolloClient = new ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/fredlacs/tess-subgrapp',
    cache: new InMemoryCache()
  });


export const getLatestOutboxEntryIndex = async ()=>{
    const res = await appolloClient.query({
        query: gql`{
          outboxEntries(orderBy:  outboxEntryIndex, orderDirection:desc, first: 1) {
            outboxEntryIndex
          }
        }
        `
      })
      return res.data.outboxEntryIndex as number
}


export const  messageHasExecuted = async (path: BigNumber, batchNumber: BigNumber)=>{
  const res = await appolloClient.query({
    query: gql`{
      outboxOutputs(where: {path:${path.toNumber()}, outboxEntry:"${batchNumber.toHexString()}", spent:true }) {
        id,
      }
    }`
  })
  return res.data.length > 0
}
