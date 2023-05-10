var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { useCallback, useState, useMemo, useEffect } from 'react';
import { BigNumber, constants, utils } from 'ethers';
import { useLocalStorage } from '@rehooks/local-storage';
import { MaxUint256 } from '@ethersproject/constants';
import { EthBridger, Erc20Bridger, L1ToL2MessageStatus, L2ToL1Message } from '@arbitrum/sdk';
import { Inbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/Inbox__factory';
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory';
import { getL1ERC20Address } from '../util/getL1ERC20Address';
import useTransactions from './useTransactions';
import { AssetType, TokenType, OutgoingMessageState, NodeBlockDeadlineStatusTypes } from './arbTokenBridge.types';
import { useBalance } from './useBalance';
import { getUniqueIdOrHashFromEvent } from '../util/migration';
import { getL1TokenData, isClassicL2ToL1TransactionEvent } from '../util';
export const wait = (ms = 0) => {
    return new Promise(res => setTimeout(res, ms));
};
export function getExecutedMessagesCacheKey({ event, l2ChainId }) {
    return isClassicL2ToL1TransactionEvent(event)
        ? `l2ChainId: ${l2ChainId}, batchNumber: ${event.batchNumber.toString()}, indexInBatch: ${event.indexInBatch.toString()}`
        : `l2ChainId: ${l2ChainId}, position: ${event.position.toString()}`;
}
class TokenDisabledError extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'TokenDisabledError';
    }
}
export const useArbTokenBridge = (params) => {
    const { walletAddress, l1, l2 } = params;
    const [bridgeTokens, setBridgeTokens] = useState(undefined);
    const { eth: [, updateEthL1Balance], erc20: [, updateErc20L1Balance] } = useBalance({
        provider: l1.provider,
        walletAddress
    });
    const { eth: [, updateEthL2Balance], erc20: [, updateErc20L2Balance] } = useBalance({
        provider: l2.provider,
        walletAddress
    });
    const [executedMessagesCache, setExecutedMessagesCache] = useLocalStorage('arbitrum:bridge:executed-messages', {});
    const [pendingWithdrawalsMap, setPendingWithdrawalMap] = useState({});
    // once the l1/l2/account changes, we need to revalidate the withdrawal list in the store
    // this prevents previous account/chains' transactions to show up in the current account
    // also makes sure the state of app doesn't get incrementally bloated with all accounts' txns loaded up till date
    useEffect(() => {
        setPendingWithdrawalMap({});
    }, [l1.provider, l2.provider, walletAddress]);
    const [transactions, { addTransaction, addTransactions, setDepositsInStore, setTransactionFailure, clearPendingTransactions, setTransactionConfirmed, setTransactionSuccess, updateTransaction, fetchAndUpdateL1ToL2MsgStatus, fetchAndUpdateL1ToL2MsgClassicStatus, fetchAndUpdateEthDepositMessageStatus }] = useTransactions();
    const l1NetworkID = useMemo(() => String(l1.network.chainID), [l1.network]);
    const l2NetworkID = useMemo(() => String(l2.network.chainID), [l2.network]);
    function getL2GatewayAddress(erc20L1Address) {
        return __awaiter(this, void 0, void 0, function* () {
            const erc20Bridger = yield Erc20Bridger.fromProvider(l2.provider);
            return erc20Bridger.getL2GatewayAddress(erc20L1Address, l2.provider);
        });
    }
    /**
     * Retrieves the L2 address of an ERC-20 token using its L1 address.
     * @param erc20L1Address
     * @returns
     */
    function getL2ERC20Address(erc20L1Address) {
        return __awaiter(this, void 0, void 0, function* () {
            const erc20Bridger = yield Erc20Bridger.fromProvider(l2.provider);
            return yield erc20Bridger.getL2ERC20Address(erc20L1Address, l1.provider);
        });
    }
    /**
     * Retrieves data about whether an ERC-20 token is disabled on the router.
     * @param erc20L1Address
     * @returns
     */
    function l1TokenIsDisabled(erc20L1Address) {
        return __awaiter(this, void 0, void 0, function* () {
            const erc20Bridger = yield Erc20Bridger.fromProvider(l2.provider);
            return erc20Bridger.l1TokenIsDisabled(erc20L1Address, l1.provider);
        });
    }
    const depositEth = ({ amount, l1Signer, txLifecycle }) => __awaiter(void 0, void 0, void 0, function* () {
        const ethBridger = yield EthBridger.fromProvider(l2.provider);
        let tx;
        try {
            tx = yield ethBridger.deposit({
                amount,
                l1Signer
            });
            if (txLifecycle === null || txLifecycle === void 0 ? void 0 : txLifecycle.onTxSubmit) {
                txLifecycle.onTxSubmit(tx);
            }
        }
        catch (error) {
            if (txLifecycle === null || txLifecycle === void 0 ? void 0 : txLifecycle.onTxError) {
                txLifecycle.onTxError(error);
            }
            return error.message;
        }
        addTransaction({
            type: 'deposit-l1',
            status: 'pending',
            value: utils.formatEther(amount),
            txID: tx.hash,
            assetName: 'ETH',
            assetType: AssetType.ETH,
            sender: walletAddress,
            l1NetworkID,
            l2NetworkID
        });
        const receipt = yield tx.wait();
        if (txLifecycle === null || txLifecycle === void 0 ? void 0 : txLifecycle.onTxConfirm) {
            txLifecycle.onTxConfirm(receipt);
        }
        const [ethDepositMessage] = yield receipt.getEthDeposits(l2.provider);
        if (!ethDepositMessage) {
            return;
        }
        const l1ToL2MsgData = {
            fetchingUpdate: false,
            status: L1ToL2MessageStatus.NOT_YET_CREATED,
            retryableCreationTxID: ethDepositMessage.l2DepositTxHash,
            l2TxID: undefined
        };
        updateTransaction(receipt, tx, l1ToL2MsgData);
        updateEthBalances();
    });
    function depositEthEstimateGas({ amount }) {
        return __awaiter(this, void 0, void 0, function* () {
            const ethBridger = yield EthBridger.fromProvider(l2.provider);
            const depositRequest = yield ethBridger.getDepositRequest({
                amount,
                from: walletAddress
            });
            const estimatedL1Gas = yield l1.provider.estimateGas(depositRequest.txRequest);
            const estimatedL2Gas = constants.Zero;
            const estimatedL2SubmissionCost = constants.Zero;
            return { estimatedL1Gas, estimatedL2Gas, estimatedL2SubmissionCost };
        });
    }
    function withdrawEth({ amount, l2Signer, txLifecycle }) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const ethBridger = yield EthBridger.fromProvider(l2.provider);
                const tx = yield ethBridger.withdraw({
                    amount,
                    l2Signer,
                    destinationAddress: walletAddress,
                    from: walletAddress
                });
                if (txLifecycle === null || txLifecycle === void 0 ? void 0 : txLifecycle.onTxSubmit) {
                    txLifecycle.onTxSubmit(tx);
                }
                addTransaction({
                    type: 'withdraw',
                    status: 'pending',
                    value: utils.formatEther(amount),
                    txID: tx.hash,
                    assetName: 'ETH',
                    assetType: AssetType.ETH,
                    sender: walletAddress,
                    blockNumber: tx.blockNumber,
                    l1NetworkID,
                    l2NetworkID
                });
                const receipt = yield tx.wait();
                if (txLifecycle === null || txLifecycle === void 0 ? void 0 : txLifecycle.onTxConfirm) {
                    txLifecycle.onTxConfirm(receipt);
                }
                updateTransaction(receipt, tx);
                updateEthBalances();
                const l2ToL1Events = receipt.getL2ToL1Events();
                if (l2ToL1Events.length === 1) {
                    const l2ToL1EventResult = l2ToL1Events[0];
                    if (!l2ToL1EventResult) {
                        return;
                    }
                    const id = getUniqueIdOrHashFromEvent(l2ToL1EventResult).toString();
                    const outgoingMessageState = OutgoingMessageState.UNCONFIRMED;
                    const l2ToL1EventResultPlus = Object.assign(Object.assign({}, l2ToL1EventResult), { type: AssetType.ETH, value: amount, outgoingMessageState, symbol: 'ETH', decimals: 18, nodeBlockDeadline: NodeBlockDeadlineStatusTypes.NODE_NOT_CREATED, l2TxHash: tx.hash });
                    setPendingWithdrawalMap(oldPendingWithdrawalsMap => {
                        return Object.assign(Object.assign({}, oldPendingWithdrawalsMap), { [id]: l2ToL1EventResultPlus });
                    });
                }
                return receipt;
            }
            catch (error) {
                if (txLifecycle === null || txLifecycle === void 0 ? void 0 : txLifecycle.onTxError) {
                    txLifecycle.onTxError(error);
                }
                console.error('withdrawEth err', error);
            }
        });
    }
    function withdrawEthEstimateGas({ amount }) {
        return __awaiter(this, void 0, void 0, function* () {
            const ethBridger = yield EthBridger.fromProvider(l2.provider);
            const withdrawalRequest = yield ethBridger.getWithdrawalRequest({
                amount,
                destinationAddress: walletAddress,
                from: walletAddress
            });
            // Can't do this atm. Hardcoded to 130_000.
            const estimatedL1Gas = BigNumber.from(130000);
            const estimatedL2Gas = yield l2.provider.estimateGas(withdrawalRequest.txRequest);
            return { estimatedL1Gas, estimatedL2Gas };
        });
    }
    const approveToken = ({ erc20L1Address, l1Signer }) => __awaiter(void 0, void 0, void 0, function* () {
        const erc20Bridger = yield Erc20Bridger.fromProvider(l2.provider);
        const tx = yield erc20Bridger.approveToken({
            erc20L1Address,
            l1Signer
        });
        const tokenData = yield getL1TokenData({
            account: walletAddress,
            erc20L1Address,
            l1Provider: l1.provider,
            l2Provider: l2.provider
        });
        addTransaction({
            type: 'approve',
            status: 'pending',
            value: null,
            txID: tx.hash,
            assetName: tokenData.symbol,
            assetType: AssetType.ERC20,
            sender: walletAddress,
            l1NetworkID
        });
        const receipt = yield tx.wait();
        updateTransaction(receipt, tx);
        updateTokenData(erc20L1Address);
    });
    const approveTokenEstimateGas = ({ erc20L1Address }) => __awaiter(void 0, void 0, void 0, function* () {
        const erc20Bridger = yield Erc20Bridger.fromProvider(l2.provider);
        const l1GatewayAddress = yield erc20Bridger.getL1GatewayAddress(erc20L1Address, l1.provider);
        const contract = ERC20__factory.connect(erc20L1Address, l1.provider);
        return contract.estimateGas.approve(l1GatewayAddress, MaxUint256, {
            from: walletAddress
        });
    });
    const approveTokenL2 = ({ erc20L1Address, l2Signer }) => __awaiter(void 0, void 0, void 0, function* () {
        if (typeof bridgeTokens === 'undefined') {
            return;
        }
        const bridgeToken = bridgeTokens[erc20L1Address];
        if (!bridgeToken)
            throw new Error('Bridge token not found');
        const { l2Address } = bridgeToken;
        if (!l2Address)
            throw new Error('L2 address not found');
        const gatewayAddress = yield getL2GatewayAddress(erc20L1Address);
        const contract = yield ERC20__factory.connect(l2Address, l2Signer);
        const tx = yield contract.functions.approve(gatewayAddress, MaxUint256);
        const tokenData = yield getL1TokenData({
            account: walletAddress,
            erc20L1Address,
            l1Provider: l1.provider,
            l2Provider: l2.provider
        });
        addTransaction({
            type: 'approve-l2',
            status: 'pending',
            value: null,
            txID: tx.hash,
            assetName: tokenData.symbol,
            assetType: AssetType.ERC20,
            sender: walletAddress,
            blockNumber: tx.blockNumber,
            l1NetworkID,
            l2NetworkID
        });
        const receipt = yield tx.wait();
        updateTransaction(receipt, tx);
        updateTokenData(erc20L1Address);
    });
    function depositToken({ erc20L1Address, amount, l1Signer, txLifecycle, destinationAddress }) {
        return __awaiter(this, void 0, void 0, function* () {
            const erc20Bridger = yield Erc20Bridger.fromProvider(l2.provider);
            try {
                const { symbol, decimals } = yield getL1TokenData({
                    account: walletAddress,
                    erc20L1Address,
                    l1Provider: l1.provider,
                    l2Provider: l2.provider
                });
                const depositRequest = yield erc20Bridger.getDepositRequest({
                    l1Provider: l1.provider,
                    l2Provider: l2.provider,
                    from: walletAddress,
                    erc20L1Address,
                    destinationAddress,
                    amount
                });
                const tx = yield erc20Bridger.deposit(Object.assign(Object.assign({}, depositRequest), { l1Signer }));
                if (txLifecycle === null || txLifecycle === void 0 ? void 0 : txLifecycle.onTxSubmit) {
                    txLifecycle.onTxSubmit(tx);
                }
                addTransaction({
                    type: 'deposit-l1',
                    status: 'pending',
                    value: utils.formatUnits(amount, decimals),
                    txID: tx.hash,
                    assetName: symbol,
                    assetType: AssetType.ERC20,
                    tokenAddress: erc20L1Address,
                    sender: walletAddress,
                    l1NetworkID,
                    l2NetworkID
                });
                const receipt = yield tx.wait();
                if (txLifecycle === null || txLifecycle === void 0 ? void 0 : txLifecycle.onTxConfirm) {
                    txLifecycle.onTxConfirm(receipt);
                }
                const [l1ToL2Msg] = yield receipt.getL1ToL2Messages(l2.provider);
                if (!l1ToL2Msg) {
                    return;
                }
                const l1ToL2MsgData = {
                    fetchingUpdate: false,
                    status: L1ToL2MessageStatus.NOT_YET_CREATED,
                    retryableCreationTxID: l1ToL2Msg.retryableCreationId,
                    l2TxID: undefined
                };
                updateTransaction(receipt, tx, l1ToL2MsgData);
                updateTokenData(erc20L1Address);
                return receipt;
            }
            catch (error) {
                if (txLifecycle === null || txLifecycle === void 0 ? void 0 : txLifecycle.onTxError) {
                    txLifecycle.onTxError(error);
                }
            }
        });
    }
    function depositTokenEstimateGas() {
        return __awaiter(this, void 0, void 0, function* () {
            const l1BaseFee = yield l1.provider.getGasPrice();
            const inbox = Inbox__factory.connect(l2.network.ethBridge.inbox, l1.provider);
            const estimatedL2SubmissionCost = yield inbox.calculateRetryableSubmissionFee(
            // Values set by looking at a couple of L1 gateways
            //
            // L1 LPT Gateway: 324
            // L1 DAI Gateway: 324
            // L1 Standard Gateway (APE): 740
            // L1 Custom Gateway (USDT): 324
            // L1 WETH Gateway: 324
            BigNumber.from(1000), 
            // We do the same percent increase in the SDK
            //
            // https://github.com/OffchainLabs/arbitrum-sdk/blob/main/src/lib/message/L1ToL2MessageGasEstimator.ts#L132
            l1BaseFee.add(l1BaseFee.mul(BigNumber.from(3))));
            return {
                // Values set by looking at a couple of different ERC-20 deposits
                //
                // https://etherscan.io/tx/0x5c0ab94413217d54641ba5faa0c614c6dd5f97efcc7a6ca25df9c376738dfa34
                // https://etherscan.io/tx/0x0049a5a171b891c5826ba47e77871fa6bae6eb57fcaf474a97d62ab07a815a2c
                // https://etherscan.io/tx/0xb11bffdfbe4bc6fb4328c390d4cdf73bc863dbaaef057afb59cd83dfd6dc210c
                // https://etherscan.io/tx/0x194ab69d3d2b5730b37e8bad1473f8bc54ded7a2ad3708d131ef13c09168d67e
                // https://etherscan.io/tx/0xc4789d3f13e0efb011dfa88eef89b4b715d8c32366977eae2d3b85f13b3aa6c5
                estimatedL1Gas: BigNumber.from(240000),
                // Values set by looking at a couple of different ERC-20 deposits
                //
                // https://arbiscan.io/tx/0x483206b0ed4e8a23b14de070f6c552120d0b9bc6ed028f4feae33c4ca832f2bc
                // https://arbiscan.io/tx/0xd2ba11ebc51f546abc2ddda715507948d097e5707fd1dc37c239cc4cf28cc6ed
                // https://arbiscan.io/tx/0xb341745b6f4a34ee539c628dcf177fc98b658e494c7f8d21da872e69d5173596
                // https://arbiscan.io/tx/0x731d31834bc01d33a1de33b5562b29c1ae6f75d20f6da83a5d74c3c91bd2dab9
                // https://arbiscan.io/tx/0x6b13bfe9f22640ac25f77a677a3c36e748913d5e07766b3d6394de09a1398020
                estimatedL2Gas: BigNumber.from(100000),
                estimatedL2SubmissionCost
            };
        });
    }
    function withdrawToken({ erc20L1Address, amount, l2Signer, txLifecycle, destinationAddress }) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const erc20Bridger = yield Erc20Bridger.fromProvider(l2.provider);
                const provider = l2Signer.provider;
                const isSmartContractAddress = provider && (yield provider.getCode(String(erc20L1Address))).length < 2;
                if (isSmartContractAddress && !destinationAddress) {
                    throw new Error(`Missing destination address`);
                }
                if (typeof bridgeTokens === 'undefined') {
                    return;
                }
                const bridgeToken = bridgeTokens[erc20L1Address];
                const { symbol, decimals } = yield (() => __awaiter(this, void 0, void 0, function* () {
                    if (bridgeToken) {
                        const { symbol, decimals } = bridgeToken;
                        return { symbol, decimals };
                    }
                    const { symbol, decimals } = yield getL1TokenData({
                        account: walletAddress,
                        erc20L1Address,
                        l1Provider: l1.provider,
                        l2Provider: l2.provider
                    });
                    addToken(erc20L1Address);
                    return { symbol, decimals };
                }))();
                const tx = yield erc20Bridger.withdraw({
                    l2Signer,
                    erc20l1Address: erc20L1Address,
                    destinationAddress: destinationAddress !== null && destinationAddress !== void 0 ? destinationAddress : walletAddress,
                    amount
                });
                if (txLifecycle === null || txLifecycle === void 0 ? void 0 : txLifecycle.onTxSubmit) {
                    txLifecycle.onTxSubmit(tx);
                }
                addTransaction({
                    type: 'withdraw',
                    status: 'pending',
                    value: utils.formatUnits(amount, decimals),
                    txID: tx.hash,
                    assetName: symbol,
                    assetType: AssetType.ERC20,
                    sender: walletAddress,
                    blockNumber: tx.blockNumber,
                    l1NetworkID,
                    l2NetworkID
                });
                const receipt = yield tx.wait();
                if (txLifecycle === null || txLifecycle === void 0 ? void 0 : txLifecycle.onTxConfirm) {
                    txLifecycle.onTxConfirm(receipt);
                }
                updateTransaction(receipt, tx);
                const l2ToL1Events = receipt.getL2ToL1Events();
                if (l2ToL1Events.length === 1) {
                    const l2ToL1EventDataResult = l2ToL1Events[0];
                    if (!l2ToL1EventDataResult) {
                        return;
                    }
                    const id = getUniqueIdOrHashFromEvent(l2ToL1EventDataResult).toString();
                    const outgoingMessageState = OutgoingMessageState.UNCONFIRMED;
                    const l2ToL1EventDataResultPlus = Object.assign(Object.assign({}, l2ToL1EventDataResult), { type: AssetType.ERC20, tokenAddress: erc20L1Address, value: amount, outgoingMessageState, symbol: symbol, decimals: decimals, nodeBlockDeadline: NodeBlockDeadlineStatusTypes.NODE_NOT_CREATED, l2TxHash: tx.hash });
                    setPendingWithdrawalMap(oldPendingWithdrawalsMap => {
                        return Object.assign(Object.assign({}, oldPendingWithdrawalsMap), { [id]: l2ToL1EventDataResultPlus });
                    });
                }
                updateTokenData(erc20L1Address);
                return receipt;
            }
            catch (error) {
                if (txLifecycle === null || txLifecycle === void 0 ? void 0 : txLifecycle.onTxError) {
                    txLifecycle.onTxError(error);
                }
                console.warn('withdraw token err', error);
            }
        });
    }
    function withdrawTokenEstimateGas({ amount, erc20L1Address }) {
        return __awaiter(this, void 0, void 0, function* () {
            const erc20Bridger = yield Erc20Bridger.fromProvider(l2.provider);
            const estimatedL1Gas = BigNumber.from(160000);
            const withdrawalRequest = yield erc20Bridger.getWithdrawalRequest({
                amount,
                destinationAddress: walletAddress,
                erc20l1Address: erc20L1Address,
                from: walletAddress
            });
            const estimatedL2Gas = yield l2.provider.estimateGas(withdrawalRequest.txRequest);
            return { estimatedL1Gas, estimatedL2Gas };
        });
    }
    const removeTokensFromList = (listID) => {
        setBridgeTokens(prevBridgeTokens => {
            const newBridgeTokens = Object.assign({}, prevBridgeTokens);
            for (const address in bridgeTokens) {
                const token = bridgeTokens[address];
                if (!token)
                    continue;
                token.listIds.delete(listID);
                if (token.listIds.size === 0) {
                    delete newBridgeTokens[address];
                }
            }
            return newBridgeTokens;
        });
    };
    const addTokensFromList = (arbTokenList, listId) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const l1ChainID = l1.network.chainID;
        const l2ChainID = l2.network.chainID;
        const bridgeTokensToAdd = {};
        const candidateUnbridgedTokensToAdd = [];
        for (const tokenData of arbTokenList.tokens) {
            const { address, name, symbol, extensions, decimals, logoURI, chainId } = tokenData;
            if (![l1ChainID, l2ChainID].includes(chainId)) {
                continue;
            }
            const bridgeInfo = (() => {
                const isExtensions = (obj) => {
                    if (!obj)
                        return false;
                    if (!obj['bridgeInfo'])
                        return false;
                    return Object.keys(obj['bridgeInfo'])
                        .map(key => obj['bridgeInfo'][key])
                        .every(e => e &&
                        'tokenAddress' in e &&
                        'originBridgeAddress' in e &&
                        'destBridgeAddress' in e);
                };
                if (!isExtensions(extensions)) {
                    return null;
                }
                else {
                    return extensions.bridgeInfo;
                }
            })();
            if (bridgeInfo) {
                const l1Address = (_a = bridgeInfo[l1NetworkID]) === null || _a === void 0 ? void 0 : _a.tokenAddress.toLowerCase();
                if (!l1Address) {
                    return;
                }
                bridgeTokensToAdd[l1Address] = {
                    name,
                    type: TokenType.ERC20,
                    symbol,
                    address: l1Address,
                    l2Address: address.toLowerCase(),
                    decimals,
                    logoURI,
                    listIds: new Set([listId])
                };
            }
            // save potentially unbridged L1 tokens:
            // stopgap: giant lists (i.e., CMC list) currently severaly hurts page performace, so for now we only add the bridged tokens
            else if (arbTokenList.tokens.length < 1000) {
                candidateUnbridgedTokensToAdd.push({
                    name,
                    type: TokenType.ERC20,
                    symbol,
                    address: address.toLowerCase(),
                    decimals,
                    logoURI,
                    listIds: new Set([listId])
                });
            }
        }
        // add L1 tokens only if they aren't already bridged (i.e., if they haven't already beed added as L2 arb-tokens to the list)
        const l1AddressesOfBridgedTokens = new Set(Object.keys(bridgeTokensToAdd).map(l1Address => l1Address.toLowerCase() /* lists should have the checksummed case anyway, but just in case (pun unintended) */));
        for (const l1TokenData of candidateUnbridgedTokensToAdd) {
            if (!l1AddressesOfBridgedTokens.has(l1TokenData.address.toLowerCase())) {
                bridgeTokensToAdd[l1TokenData.address] = l1TokenData;
            }
        }
        // Callback is used here, so we can add listId to the set of listIds rather than creating a new set everytime
        setBridgeTokens(oldBridgeTokens => {
            var _a;
            const l1Addresses = [];
            const l2Addresses = [];
            for (const tokenAddress in bridgeTokensToAdd) {
                const tokenToAdd = bridgeTokensToAdd[tokenAddress];
                if (!tokenToAdd) {
                    return;
                }
                const { address, l2Address } = tokenToAdd;
                if (address) {
                    l1Addresses.push(address);
                }
                if (l2Address) {
                    l2Addresses.push(l2Address);
                }
                // Add the new list id being imported (`listId`) to the existing list ids (from `oldBridgeTokens[address]`)
                // Set the result to token added to `bridgeTokens` : `tokenToAdd.listIds`
                const oldListIds = ((_a = oldBridgeTokens === null || oldBridgeTokens === void 0 ? void 0 : oldBridgeTokens[tokenToAdd.address]) === null || _a === void 0 ? void 0 : _a.listIds) || new Set();
                tokenToAdd.listIds = new Set([...oldListIds, listId]);
            }
            updateErc20L1Balance(l1Addresses);
            updateErc20L2Balance(l2Addresses);
            return Object.assign(Object.assign({}, oldBridgeTokens), bridgeTokensToAdd);
        });
    });
    function addToken(erc20L1orL2Address) {
        return __awaiter(this, void 0, void 0, function* () {
            let l1Address;
            let l2Address;
            const lowercasedErc20L1orL2Address = erc20L1orL2Address.toLowerCase();
            const maybeL1Address = yield getL1ERC20Address({
                erc20L2Address: lowercasedErc20L1orL2Address,
                l2Provider: l2.provider
            });
            if (maybeL1Address) {
                // looks like l2 address was provided
                l1Address = maybeL1Address;
                l2Address = lowercasedErc20L1orL2Address;
            }
            else {
                // looks like l1 address was provided
                l1Address = lowercasedErc20L1orL2Address;
                l2Address = yield getL2ERC20Address(l1Address);
            }
            const bridgeTokensToAdd = {};
            const { name, symbol, decimals } = yield getL1TokenData({
                account: walletAddress,
                erc20L1Address: l1Address,
                l1Provider: l1.provider,
                l2Provider: l2.provider
            });
            const isDisabled = yield l1TokenIsDisabled(l1Address);
            if (isDisabled) {
                throw new TokenDisabledError('Token currently disabled');
            }
            const l1AddressLowerCased = l1Address.toLowerCase();
            bridgeTokensToAdd[l1AddressLowerCased] = {
                name,
                type: TokenType.ERC20,
                symbol,
                address: l1AddressLowerCased,
                l2Address: l2Address === null || l2Address === void 0 ? void 0 : l2Address.toLowerCase(),
                decimals,
                listIds: new Set()
            };
            setBridgeTokens(oldBridgeTokens => {
                return Object.assign(Object.assign({}, oldBridgeTokens), bridgeTokensToAdd);
            });
            updateErc20L1Balance([l1AddressLowerCased]);
            if (l2Address) {
                updateErc20L2Balance([l2Address]);
            }
        });
    }
    const updateTokenData = useCallback((l1Address) => __awaiter(void 0, void 0, void 0, function* () {
        if (typeof bridgeTokens === 'undefined') {
            return;
        }
        const l1AddressLowerCased = l1Address.toLowerCase();
        const bridgeToken = bridgeTokens[l1AddressLowerCased];
        if (!bridgeToken) {
            return;
        }
        const newBridgeTokens = { [l1AddressLowerCased]: bridgeToken };
        setBridgeTokens(oldBridgeTokens => {
            return Object.assign(Object.assign({}, oldBridgeTokens), newBridgeTokens);
        });
        const { l2Address } = bridgeToken;
        updateErc20L1Balance([l1AddressLowerCased]);
        if (l2Address) {
            updateErc20L2Balance([l2Address]);
        }
    }), [bridgeTokens, setBridgeTokens, updateErc20L1Balance, updateErc20L2Balance]);
    const updateEthBalances = () => __awaiter(void 0, void 0, void 0, function* () {
        Promise.all([updateEthL1Balance(), updateEthL2Balance()]);
    });
    function triggerOutboxToken({ id, l1Signer }) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = pendingWithdrawalsMap[id];
            if (!event) {
                throw new Error('Outbox message not found');
            }
            const { tokenAddress, value } = event;
            const messageWriter = L2ToL1Message.fromEvent(l1Signer, event);
            const res = yield messageWriter.execute(l2.provider);
            const { symbol, decimals } = yield getL1TokenData({
                account: walletAddress,
                erc20L1Address: tokenAddress,
                l1Provider: l1.provider,
                l2Provider: l2.provider
            });
            addTransaction({
                status: 'pending',
                type: 'outbox',
                value: utils.formatUnits(value, decimals),
                assetName: symbol,
                assetType: AssetType.ERC20,
                sender: walletAddress,
                txID: res.hash,
                l1NetworkID,
                l2ToL1MsgData: { uniqueId: getUniqueIdOrHashFromEvent(event) }
            });
            const rec = yield res.wait();
            if (rec.status === 1) {
                setTransactionSuccess(rec.transactionHash);
                addToExecutedMessagesCache([event]);
                setPendingWithdrawalMap(oldPendingWithdrawalsMap => {
                    const newPendingWithdrawalsMap = Object.assign({}, oldPendingWithdrawalsMap);
                    const pendingWithdrawal = newPendingWithdrawalsMap[id];
                    if (pendingWithdrawal) {
                        pendingWithdrawal.outgoingMessageState = OutgoingMessageState.EXECUTED;
                    }
                    return newPendingWithdrawalsMap;
                });
            }
            else {
                setTransactionFailure(rec.transactionHash);
            }
            return rec;
        });
    }
    function triggerOutboxEth({ id, l1Signer }) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = pendingWithdrawalsMap[id];
            if (!event) {
                throw new Error('Outbox message not found');
            }
            const { value } = event;
            const messageWriter = L2ToL1Message.fromEvent(l1Signer, event);
            const res = yield messageWriter.execute(l2.provider);
            addTransaction({
                status: 'pending',
                type: 'outbox',
                value: utils.formatEther(value),
                assetName: 'ETH',
                assetType: AssetType.ETH,
                sender: walletAddress,
                txID: res.hash,
                l1NetworkID,
                l2ToL1MsgData: { uniqueId: getUniqueIdOrHashFromEvent(event) }
            });
            const rec = yield res.wait();
            if (rec.status === 1) {
                setTransactionSuccess(rec.transactionHash);
                addToExecutedMessagesCache([event]);
                setPendingWithdrawalMap(oldPendingWithdrawalsMap => {
                    const newPendingWithdrawalsMap = Object.assign({}, oldPendingWithdrawalsMap);
                    const pendingWithdrawal = newPendingWithdrawalsMap[id];
                    if (pendingWithdrawal) {
                        pendingWithdrawal.outgoingMessageState = OutgoingMessageState.EXECUTED;
                    }
                    return newPendingWithdrawalsMap;
                });
            }
            else {
                setTransactionFailure(rec.transactionHash);
            }
            return rec;
        });
    }
    function addToExecutedMessagesCache(events) {
        const added = {};
        events.forEach((event) => {
            const cacheKey = getExecutedMessagesCacheKey({
                event,
                l2ChainId: l2.network.chainID
            });
            added[cacheKey] = true;
        });
        setExecutedMessagesCache(Object.assign(Object.assign({}, executedMessagesCache), added));
    }
    const setWithdrawalsInStore = (withdrawalTxns) => {
        const pwMap = {};
        withdrawalTxns.forEach(tx => {
            const id = getUniqueIdOrHashFromEvent(tx).toString();
            pwMap[id] = tx;
        });
        setPendingWithdrawalMap(Object.assign(Object.assign({}, pendingWithdrawalsMap), pwMap));
    };
    return {
        walletAddress,
        bridgeTokens,
        eth: {
            deposit: depositEth,
            depositEstimateGas: depositEthEstimateGas,
            withdraw: withdrawEth,
            withdrawEstimateGas: withdrawEthEstimateGas,
            triggerOutbox: triggerOutboxEth
        },
        token: {
            add: addToken,
            addTokensFromList,
            removeTokensFromList,
            updateTokenData,
            approve: approveToken,
            approveEstimateGas: approveTokenEstimateGas,
            approveL2: approveTokenL2,
            deposit: depositToken,
            depositEstimateGas: depositTokenEstimateGas,
            withdraw: withdrawToken,
            withdrawEstimateGas: withdrawTokenEstimateGas,
            triggerOutbox: triggerOutboxToken,
            getL2ERC20Address,
            getL2GatewayAddress
        },
        transactions: {
            transactions,
            setDepositsInStore,
            clearPendingTransactions,
            setTransactionConfirmed,
            updateTransaction,
            addTransaction,
            addTransactions,
            fetchAndUpdateL1ToL2MsgStatus,
            fetchAndUpdateL1ToL2MsgClassicStatus,
            fetchAndUpdateEthDepositMessageStatus
        },
        pendingWithdrawalsMap: pendingWithdrawalsMap,
        setWithdrawalsInStore
    };
};
