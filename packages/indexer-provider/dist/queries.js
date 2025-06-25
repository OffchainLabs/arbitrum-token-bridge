export const buildTransfersQuery = (address) => {
    return `
    query GetAllTransfers {
      depositErc20s(
        where: { OR: [{ fromAddress: "${address}" }, { toAddress: "${address}" }] }
        orderBy: "parentChainTimestamp"
        orderDirection: "desc"
        limit: 100
      ) {
        items {
          id
          fromAddress
          toAddress
          l1TokenAddress
          amount
          statusOnChildChain
          parentChainTimestamp
          childChainExecutionTimestamp
          parentChainTxHash
          childChainTxHash
          sequenceNumber
          parentChainId
          childChainId
        }
      }
      depositEths(
        where: { OR: [{ parentChainSenderAddress: "${address}" }, { childChainRecipientAddress: "${address}" }] }
        orderBy: "parentChainTimestamp"
        orderDirection: "desc"
        limit: 100
      ) {
        items {
          id
          parentChainSenderAddress
          childChainRecipientAddress
          ethAmountDepositedToChildChain
          statusOnChildChain
          parentChainTimestamp
          childChainExecutionTimestamp
          parentChainTxHash
          childChainTxHash
          messageSequenceNumber
          parentChainId
          childChainId
        }
      }
    }
  `;
};
export const executeGraphQLQuery = async (apiUrl, query) => {
    const response = await fetch(`${apiUrl}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    });
    const result = await response.json();
    if (result.errors) {
        throw new Error(result.errors[0].message);
    }
    return result.data;
};
export const normalizeTransfers = (erc20Data, ethData) => {
    const transfers = [];
    // Normalize ERC20 transfers
    erc20Data.forEach(item => {
        transfers.push({
            id: item.id,
            type: 'ERC20',
            fromAddress: item.fromAddress,
            toAddress: item.toAddress,
            tokenAddress: item.l1TokenAddress,
            parentChainId: item.parentChainId,
            childChainId: item.childChainId,
            amount: item.amount,
            status: item.statusOnChildChain,
            timestamp: item.parentChainTimestamp,
            executionTimestamp: item.childChainExecutionTimestamp,
            txHash: item.parentChainTxHash,
            childTxHash: item.childChainTxHash,
            sequenceNumber: item.sequenceNumber,
        });
    });
    // Normalize ETH transfers
    ethData.forEach(item => {
        transfers.push({
            id: item.id,
            type: 'ETH',
            fromAddress: item.parentChainSenderAddress,
            toAddress: item.childChainRecipientAddress,
            tokenAddress: undefined,
            parentChainId: item.parentChainId,
            childChainId: item.childChainId,
            amount: item.ethAmountDepositedToChildChain,
            status: item.statusOnChildChain,
            timestamp: item.parentChainTimestamp,
            executionTimestamp: item.childChainExecutionTimestamp,
            txHash: item.parentChainTxHash,
            childTxHash: item.childChainTxHash,
            sequenceNumber: item.messageSequenceNumber,
        });
    });
    // Sort by timestamp (newest first)
    return transfers.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
};
export const categorizeTransfers = (transfers) => {
    const pending = transfers.filter(t => t.status === 'PARENT_CHAIN_CONFIRMED' || t.status === 'CHILD_CHAIN_REDEMPTION_SCHEDULED');
    const completed = transfers.filter(t => t.status === 'CHILD_CHAIN_EXECUTED');
    return { pending, completed };
};
