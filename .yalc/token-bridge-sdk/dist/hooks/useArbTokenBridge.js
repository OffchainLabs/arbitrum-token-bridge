var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { useCallback, useEffect, useState } from 'react';
import { constants, ethers, utils } from 'ethers';
import { useLocalStorage } from '@rehooks/local-storage';
import { ERC20__factory, OutgoingMessageState } from 'arb-ts';
import useTransactions from './useTransactions';
import { AssetType, TokenType } from './arbTokenBridge.types';
const { Zero } = constants;
/* eslint-disable no-shadow */
const slowInboxQueueTimeout = 1000 * 60 * 15;
const addressToSymbol = {};
export const useArbTokenBridge = (bridge, autoLoadCache = true) => {
    const [walletAddress, setWalletAddress] = useState('');
    const defaultBalance = {
        balance: constants.Zero,
        arbChainBalance: constants.Zero
    };
    const [ethBalances, setEthBalances] = useState(defaultBalance);
    // inellegant, but works for now: using this state as source of truth (and calling updateBridgeTokens as needed) ensures react recognizes latest state
    const [bridgeTokens, setBridgeTokens] = useState({});
    const balanceIsEmpty = (balance) => balance['balance'] === defaultBalance['balance'] &&
        balance['arbChainBalance'] === defaultBalance['arbChainBalance'];
    const [erc20Balances, setErc20Balances] = useState({});
    const [erc721Balances, setErc721Balances] = useState({});
    const defaultTokenList = [
    // kovan addresses:
    // '0xf36d7a74996e7def7a6bd52b4c2fe64019dada25', // ARBI
    // '0xe41d965f6e7541139f8d9f331176867fb6972baf' // ARB
    // '0x57Ca11067892510E022D65b0483b31Cd49155389', // ATKN
    // '0xEe83ea3c089C36622EFc6Bf438114b62d5B4C162' // USDC
    ];
    const tokenBlackList = [];
    const [ERC20Cache, setERC20Cache, clearERC20Cache] = useLocalStorage('ERC20Cache', []);
    const [ERC721Cache, setERC721Cache, clearERC721Cache] = useLocalStorage('ERC721Cache', []);
    const [executedMessagesCache, setExecutedMessagesCache, clearExecutedMessagesCache] = useLocalStorage('executedMessagesCache', {});
    const [pendingWithdrawalsMap, setPendingWithdrawalMap] = useState({});
    const [transactions, { addTransaction, setTransactionFailure, clearPendingTransactions, setTransactionConfirmed, updateTransaction, removeTransaction, addFailedTransaction }] = useTransactions();
    const [l11NetworkID, setL1NetWorkID] = useState(null);
    const l1NetworkIDCached = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        if (l11NetworkID)
            return l11NetworkID;
        const network = yield bridge.l1Bridge.l1Provider.getNetwork();
        const networkID = yield network.chainId.toString();
        setL1NetWorkID(networkID);
        return networkID;
    }), [l11NetworkID, bridge]);
    const depositEth = (etherVal) => __awaiter(void 0, void 0, void 0, function* () {
        const weiValue = utils.parseEther(etherVal);
        const tx = yield bridge.depositETH(weiValue);
        try {
            addTransaction({
                type: 'deposit-l1',
                status: 'pending',
                value: etherVal,
                txID: tx.hash,
                assetName: 'ETH',
                assetType: AssetType.ETH,
                sender: yield bridge.l1Bridge.getWalletAddress(),
                l1NetworkID: yield l1NetworkIDCached()
            });
            const receipt = yield tx.wait();
            updateTransaction(receipt, tx);
            const seqNum = yield bridge.getInboxSeqNumFromContractTransaction(receipt);
            if (!seqNum)
                return;
            const l2TxHash = yield bridge.calculateL2TransactionHash(seqNum[0]);
            addTransaction({
                type: 'deposit-l2',
                status: 'pending',
                value: etherVal,
                txID: l2TxHash,
                assetName: 'ETH',
                assetType: AssetType.ETH,
                sender: yield bridge.l1Bridge.getWalletAddress(),
                l1NetworkID: yield l1NetworkIDCached()
            });
            const l2TxnRec = yield bridge.l2Bridge.l2Provider.waitForTransaction(l2TxHash, undefined, slowInboxQueueTimeout);
            updateTransaction(l2TxnRec);
            // let l2TxnRec
            // try {
            //   l2TxnRec = await bridge.l2Provider.waitForTransaction(
            //     l2TxHash,
            //     undefined,
            //     slowInboxQueueTimeout
            //   )
            //   if(l2TxnRec.status === 0){
            //     console.warn('l2TxnRec failed', l2TxnRec)
            //     updateTransaction(l2TxnRec)
            //     return
            //   }
            // } catch (err){
            //   console.warn('l2TxHash timed out', err)
            //   removeTransaction(l2TxHash)
            //   addFailedTransaction(
            //     {
            //       type: 'deposit-l2-auto-redeem',
            //       status: 'failure',
            //       value: etherVal,
            //       txID: l2TxHash,
            //       assetName: 'ETH',
            //       assetType: AssetType.ETH,
            //       sender: await bridge.getWalletAddress()
            //     })
            //     return
            // }
            // const retryableRec = await bridge.l2Provider.waitForTransaction(
            //   l2TxHash,
            //   undefined,
            //   slowInboxQueueTimeout
            // )
            // // if it times out... it just errors? that's fine?
            // updateTransaction(retryableRec)
            return receipt;
        }
        catch (e) {
            console.error('depositEth err: ' + e);
            setTransactionFailure(tx.hash);
        }
    });
    const withdrawEth = useCallback((etherVal) => __awaiter(void 0, void 0, void 0, function* () {
        const weiValue = utils.parseEther(etherVal);
        const tx = yield bridge.withdrawETH(weiValue);
        try {
            addTransaction({
                type: 'withdraw',
                status: 'pending',
                value: etherVal,
                txID: tx.hash,
                assetName: 'ETH',
                assetType: AssetType.ETH,
                sender: yield bridge.l1Bridge.getWalletAddress(),
                blockNumber: tx.blockNumber || 0,
                l1NetworkID: yield l1NetworkIDCached()
            });
            const receipt = yield tx.wait();
            updateTransaction(receipt, tx);
            const l2ToL2EventData = yield bridge.getWithdrawalsInL2Transaction(receipt);
            if (l2ToL2EventData.length === 1) {
                const l2ToL2EventDataResult = l2ToL2EventData[0];
                console.info('withdraw event data:', l2ToL2EventDataResult);
                const id = l2ToL2EventDataResult.uniqueId.toString();
                const outgoingMessageState = yield getOutGoingMessageState(l2ToL2EventDataResult.batchNumber, l2ToL2EventDataResult.indexInBatch);
                const l2ToL2EventDataResultPlus = Object.assign(Object.assign({}, l2ToL2EventDataResult), { type: AssetType.ETH, value: weiValue, outgoingMessageState, symbol: 'ETH' });
                setPendingWithdrawalMap(Object.assign(Object.assign({}, pendingWithdrawalsMap), { [id]: l2ToL2EventDataResultPlus }));
            }
            return receipt;
        }
        catch (e) {
            console.error('withdrawEth err', e);
            setTransactionFailure(tx.hash);
        }
    }), [pendingWithdrawalsMap]);
    const approveToken = (erc20L1Address) => __awaiter(void 0, void 0, void 0, function* () {
        const tx = yield bridge.approveToken(erc20L1Address);
        const tokenData = (yield bridge.getAndUpdateL1TokenData(erc20L1Address))
            .ERC20;
        addTransaction({
            type: 'approve',
            status: 'pending',
            value: null,
            txID: tx.hash,
            assetName: (tokenData && tokenData.symbol) || '???',
            assetType: AssetType.ERC20,
            sender: yield bridge.l1Bridge.getWalletAddress(),
            l1NetworkID: yield l1NetworkIDCached()
        });
        const receipt = yield tx.wait();
        updateTransaction(receipt, tx);
        updateBridgeTokens();
    });
    const depositToken = (erc20Address, amount) => __awaiter(void 0, void 0, void 0, function* () {
        const _tokenData = yield bridge.getAndUpdateL1TokenData(erc20Address);
        if (!(_tokenData && _tokenData.ERC20)) {
            throw new Error('Token data not found');
        }
        const tokenData = _tokenData.ERC20;
        const amountParsed = yield utils.parseUnits(amount, tokenData.decimals);
        const tx = yield bridge.deposit(erc20Address, amountParsed);
        addTransaction({
            type: 'deposit-l1',
            status: 'pending',
            value: amount,
            txID: tx.hash,
            assetName: tokenData.symbol,
            assetType: AssetType.ERC20,
            sender: yield bridge.l1Bridge.getWalletAddress(),
            l1NetworkID: yield l1NetworkIDCached()
        });
        try {
            const receipt = yield tx.wait();
            updateTransaction(receipt, tx);
            const tokenDepositData = (yield bridge.getDepositTokenEventData(receipt))[0];
            const seqNum = tokenDepositData._transferId;
            const l2RetryableHash = yield bridge.calculateL2RetryableTransactionHash(seqNum);
            const autoRedeemHash = yield bridge.calculateRetryableAutoRedeemTxnHash(seqNum);
            addTransaction({
                type: 'deposit-l2',
                status: 'pending',
                value: amount,
                txID: l2RetryableHash,
                assetName: tokenData.symbol,
                assetType: AssetType.ERC20,
                sender: yield bridge.l2Bridge.getWalletAddress(),
                l1NetworkID: yield l1NetworkIDCached()
            });
            let autoRedeemHashRec;
            try {
                autoRedeemHashRec = yield bridge.l2Bridge.l2Provider.waitForTransaction(autoRedeemHash, undefined, slowInboxQueueTimeout);
                console.warn('auto redeem failed');
                if (autoRedeemHashRec.status === 0) {
                    removeTransaction(l2RetryableHash);
                    addFailedTransaction({
                        type: 'deposit-l2-auto-redeem',
                        status: 'failure',
                        value: amount,
                        txID: autoRedeemHash,
                        assetName: tokenData.symbol,
                        assetType: AssetType.ERC20,
                        sender: yield bridge.l1Bridge.getWalletAddress(),
                        l1NetworkID: yield l1NetworkIDCached()
                    });
                    return;
                }
            }
            catch (err) {
                console.warn('Auto redeem timed out');
                // keep both the retryable and the auto-redeem as pending
                addTransaction({
                    type: 'deposit-l2-auto-redeem',
                    status: 'pending',
                    value: amount,
                    txID: autoRedeemHash,
                    assetName: tokenData.symbol,
                    assetType: AssetType.ERC20,
                    sender: yield bridge.l1Bridge.getWalletAddress(),
                    l1NetworkID: yield l1NetworkIDCached()
                });
                return;
            }
            const retryableRec = yield bridge.l2Bridge.l2Provider.waitForTransaction(l2RetryableHash, undefined, slowInboxQueueTimeout);
            updateTransaction(retryableRec);
            return receipt;
        }
        catch (err) {
            setTransactionFailure(tx.hash);
        }
    });
    const withdrawToken = (erc20l1Address, amount) => __awaiter(void 0, void 0, void 0, function* () {
        const tokenData = (yield bridge.getAndUpdateL1TokenData(erc20l1Address))
            .ERC20;
        if (!tokenData) {
            throw new Error("Can't withdraw; token not found");
        }
        const amountParsed = utils.parseUnits(amount, tokenData.decimals);
        const tx = yield bridge.withdrawERC20(erc20l1Address, amountParsed);
        addTransaction({
            type: 'withdraw',
            status: 'pending',
            value: amount,
            txID: tx.hash,
            assetName: tokenData.symbol,
            assetType: AssetType.ERC20,
            sender: yield bridge.l2Bridge.getWalletAddress(),
            blockNumber: tx.blockNumber || 0,
            l1NetworkID: yield l1NetworkIDCached()
        });
        try {
            const receipt = yield tx.wait();
            updateTransaction(receipt, tx);
            const l2ToL2EventData = yield bridge.getWithdrawalsInL2Transaction(receipt);
            if (l2ToL2EventData.length === 1) {
                const l2ToL2EventDataResult = l2ToL2EventData[0];
                const id = l2ToL2EventDataResult.uniqueId.toString();
                const outgoingMessageState = yield getOutGoingMessageState(l2ToL2EventDataResult.batchNumber, l2ToL2EventDataResult.indexInBatch);
                const l2ToL2EventDataResultPlus = Object.assign(Object.assign({}, l2ToL2EventDataResult), { type: AssetType.ERC20, tokenAddress: erc20l1Address, value: amountParsed, outgoingMessageState, symbol: tokenData.symbol });
                setPendingWithdrawalMap(Object.assign(Object.assign({}, pendingWithdrawalsMap), { [id]: l2ToL2EventDataResultPlus }));
            }
            return receipt;
        }
        catch (err) {
            console.warn('err', err);
            setTransactionFailure(tx.hash);
        }
    });
    const addToken = useCallback((erc20L1orL2Address, type = TokenType.ERC20) => __awaiter(void 0, void 0, void 0, function* () {
        let l1Address = erc20L1orL2Address;
        const lCaseToken = l1Address.toLocaleLowerCase();
        if (tokenBlackList.includes(lCaseToken)) {
            // todo: error report to UI
            return '';
        }
        const l1Data = yield bridge.getAndUpdateL1TokenData(erc20L1orL2Address);
        try {
            yield bridge.getAndUpdateL2TokenData(erc20L1orL2Address);
        }
        catch (error) {
            console.info(`no L2 token for ${l1Address} (which is fine)`);
        }
        if (!(l1Data && l1Data.ERC20)) {
            try {
                l1Address =
                    (yield bridge.l2Bridge.getERC20L1Address(erc20L1orL2Address)) || '';
                if (!l1Address) {
                    throw new Error('');
                }
                yield bridge.getAndUpdateL1TokenData(l1Address);
                yield bridge.getAndUpdateL2TokenData(l1Address);
            }
            catch (err) {
                console.warn('Address is not a token address ');
            }
        }
        updateAllBalances();
        updateBridgeTokens();
        if (!ERC20Cache.includes(lCaseToken)) {
            setERC20Cache([...ERC20Cache, lCaseToken]);
        }
        return l1Address;
    }), [ERC20Cache, setERC20Cache]);
    const expireCache = () => {
        clearERC20Cache();
        clearERC721Cache();
    };
    useEffect(() => {
        const tokensToAdd = [
            ...new Set([...ERC20Cache, ...defaultTokenList].map(t => t.toLocaleLowerCase()))
        ].filter(tokenAddress => !tokenBlackList.includes(tokenAddress));
        if (autoLoadCache) {
            Promise.all(tokensToAdd.map(address => {
                return addToken(address, TokenType.ERC20).catch(err => {
                    console.warn(`invalid cache entry erc20 ${address}`);
                    console.warn(err);
                });
            })).then(values => {
                setERC20Cache(values.filter((val) => !!val));
            });
        }
        bridge.l1Bridge.getWalletAddress().then(_address => {
            setWalletAddress(_address);
        });
    }, []);
    const updateEthBalances = () => __awaiter(void 0, void 0, void 0, function* () {
        const l1Balance = yield bridge.getL1EthBalance();
        const l2Balance = yield bridge.getL2EthBalance();
        setEthBalances({
            balance: l1Balance,
            arbChainBalance: l2Balance
        });
    });
    const updateTokenBalances = () => __awaiter(void 0, void 0, void 0, function* () {
        const { l1Tokens, l2Tokens } = yield bridge.updateAllTokens();
        const erc20TokenBalances = {};
        for (const address of Object.keys(l1Tokens)) {
            const l1TokenData = l1Tokens[address];
            const l2TokenData = l2Tokens[address];
            const balance = l1TokenData.ERC20 ? l1TokenData.ERC20.balance : Zero;
            const arbChainBalance = l2TokenData && l2TokenData.ERC20 ? l2TokenData.ERC20.balance : Zero;
            erc20TokenBalances[address] = { balance, arbChainBalance };
        }
        setErc20Balances(erc20TokenBalances);
    });
    const updateAllBalances = () => {
        updateEthBalances();
        updateTokenBalances();
    };
    const triggerOutboxToken = useCallback((id) => __awaiter(void 0, void 0, void 0, function* () {
        if (!pendingWithdrawalsMap[id])
            throw new Error('Outbox message not found');
        const { batchNumber, indexInBatch, tokenAddress, value } = pendingWithdrawalsMap[id];
        const res = yield bridge.triggerL2ToL1Transaction(batchNumber, indexInBatch, true);
        const tokenData = yield bridge.getAndUpdateL1TokenData(tokenAddress);
        const symbol = (tokenData && tokenData.ERC20 && tokenData.ERC20.symbol) || '??';
        const decimals = (tokenData && tokenData.ERC20 && tokenData.ERC20.decimals) || 18;
        addTransaction({
            status: 'pending',
            type: 'outbox',
            value: ethers.utils.formatUnits(value, decimals),
            assetName: symbol,
            assetType: AssetType.ERC20,
            sender: yield bridge.l1Bridge.getWalletAddress(),
            txID: res.hash,
            l1NetworkID: yield l1NetworkIDCached()
        });
        try {
            const rec = yield res.wait();
            if (rec.status === 1) {
                setTransactionConfirmed(rec.transactionHash);
                const newPendingWithdrawalsMap = Object.assign({}, pendingWithdrawalsMap);
                delete newPendingWithdrawalsMap[id];
                setPendingWithdrawalMap(newPendingWithdrawalsMap);
                addToExecutedMessagesCache(batchNumber, indexInBatch);
            }
            else {
                setTransactionFailure(rec.transactionHash);
            }
            return rec;
        }
        catch (err) {
            console.warn('WARNING: token outbox execute failed:', err);
            setTransactionFailure(res.hash);
        }
    }), [pendingWithdrawalsMap]);
    const triggerOutboxEth = useCallback((id) => __awaiter(void 0, void 0, void 0, function* () {
        if (!pendingWithdrawalsMap[id])
            throw new Error('Outbox message not found');
        const { batchNumber, indexInBatch, value } = pendingWithdrawalsMap[id];
        const res = yield bridge.triggerL2ToL1Transaction(batchNumber, indexInBatch, true);
        addTransaction({
            status: 'pending',
            type: 'outbox',
            value: ethers.utils.formatEther(value),
            assetName: 'ETH',
            assetType: AssetType.ETH,
            sender: yield bridge.l1Bridge.getWalletAddress(),
            txID: res.hash,
            l1NetworkID: yield l1NetworkIDCached()
        });
        try {
            const rec = yield res.wait();
            if (rec.status === 1) {
                setTransactionConfirmed(rec.transactionHash);
                const newPendingWithdrawalsMap = Object.assign({}, pendingWithdrawalsMap);
                delete newPendingWithdrawalsMap[id];
                setPendingWithdrawalMap(newPendingWithdrawalsMap);
                addToExecutedMessagesCache(batchNumber, indexInBatch);
            }
            else {
                setTransactionFailure(rec.transactionHash);
            }
            return rec;
        }
        catch (err) {
            console.warn('WARNING: token outbox execute failed:', err);
            setTransactionFailure(res.hash);
        }
    }), [pendingWithdrawalsMap]);
    const updateBridgeTokens = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        const bridgeTokens = {};
        const { l1Tokens } = bridge;
        const { l2Tokens } = bridge.l2Bridge;
        for (const address of Object.keys(l1Tokens)) {
            const l1TokenData = yield bridge.getAndUpdateL1TokenData(address);
            const l2TokenData = l2Tokens[address];
            const l2Address = l2TokenData && l2TokenData.ERC20 && l2TokenData.ERC20.contract.address;
            if (l1TokenData.ERC20) {
                const { symbol, allowed, decimals, name } = l1TokenData.ERC20;
                const bridgeToken = {
                    type: TokenType.ERC20,
                    name: name,
                    symbol,
                    allowed,
                    decimals,
                    address,
                    l2Address
                };
                bridgeTokens[address] = bridgeToken;
            }
        }
        setBridgeTokens(bridgeTokens);
        return bridgeTokens;
    }), [bridge]);
    const getTokenSymbol = (_l1Address) => __awaiter(void 0, void 0, void 0, function* () {
        const l1Address = _l1Address.toLocaleLowerCase();
        if (addressToSymbol[l1Address]) {
            return addressToSymbol[l1Address];
        }
        try {
            const token = ERC20__factory.connect(l1Address, bridge.l1Provider);
            const symbol = yield token.symbol();
            addressToSymbol[l1Address] = symbol;
            return symbol;
        }
        catch (err) {
            console.warn('could not get token symbol', err);
            return '???';
        }
    });
    const getEthWithdrawals = () => __awaiter(void 0, void 0, void 0, function* () {
        const address = yield bridge.l1Bridge.getWalletAddress();
        const t = new Date().getTime();
        const withdrawalData = yield bridge.getL2ToL1EventData(address);
        console.log(`*** got eth withdraw event in ${(new Date().getTime() - t) / 1000} seconds ***`);
        const outgoingMessageStates = yield Promise.all(withdrawalData.map((eventData) => getOutGoingMessageState(eventData.batchNumber, eventData.indexInBatch)));
        return withdrawalData
            .map((eventData, i) => {
            const { caller, destination, uniqueId, batchNumber, indexInBatch, arbBlockNum, ethBlockNum, timestamp, callvalue, data } = eventData;
            if (!data || data === '0x') {
                // is an eth withdrawal
                const allWithdrawalData = {
                    caller,
                    destination,
                    uniqueId,
                    batchNumber,
                    indexInBatch,
                    arbBlockNum,
                    ethBlockNum,
                    timestamp,
                    callvalue,
                    data,
                    type: AssetType.ETH,
                    value: callvalue,
                    symbol: 'ETH',
                    outgoingMessageState: outgoingMessageStates[i]
                };
                return allWithdrawalData;
            }
        })
            .filter((x) => !!x);
    });
    const getTokenWithdrawals = (gatewayAddresses) => __awaiter(void 0, void 0, void 0, function* () {
        const address = yield bridge.l1Bridge.getWalletAddress();
        const t = new Date().getTime();
        const gateWayWithdrawalsResultsNested = yield Promise.all(gatewayAddresses.map(gatewayAddress => bridge.getGatewayWithdrawEventData(gatewayAddress, address)));
        console.log(`*** got token gateway event data in ${(new Date().getTime() - t) / 1000} seconds *** `);
        const gateWayWithdrawalsResults = gateWayWithdrawalsResultsNested.flat();
        const symbols = yield Promise.all(gateWayWithdrawalsResults.map(withdrawEventData => getTokenSymbol(withdrawEventData.token)));
        const l2Txns = yield Promise.all(gateWayWithdrawalsResults.map(withdrawEventData => bridge.getL2Transaction(withdrawEventData.txHash)));
        const outgoingMessageStates = yield Promise.all(gateWayWithdrawalsResults.map((withdrawEventData, i) => {
            const eventDataArr = bridge.getWithdrawalsInL2Transaction(l2Txns[i]);
            // TODO: length != 1
            const { batchNumber, indexInBatch } = eventDataArr[0];
            return getOutGoingMessageState(batchNumber, indexInBatch);
        }));
        return gateWayWithdrawalsResults.map((withdrawEventData, i) => {
            // TODO: length != 1
            const eventDataArr = bridge.getWithdrawalsInL2Transaction(l2Txns[i]);
            const { caller, destination, uniqueId, batchNumber, indexInBatch, arbBlockNum, ethBlockNum, timestamp, callvalue, data } = eventDataArr[0];
            const eventDataPlus = {
                caller,
                destination,
                uniqueId,
                batchNumber,
                indexInBatch,
                arbBlockNum,
                ethBlockNum,
                timestamp,
                callvalue,
                data,
                type: AssetType.ERC20,
                value: withdrawEventData._amount,
                tokenAddress: withdrawEventData.token,
                outgoingMessageState: outgoingMessageStates[i],
                symbol: symbols[i]
            };
            return eventDataPlus;
        });
    });
    const setInitialPendingWithdrawals = (gatewayAddresses) => __awaiter(void 0, void 0, void 0, function* () {
        const pendingWithdrawals = {};
        const t = new Date().getTime();
        console.log('*** Getting initial pending withdrawal data ***');
        const l2ToL1Txns = (yield Promise.all([
            getEthWithdrawals(),
            getTokenWithdrawals(gatewayAddresses)
        ])).flat();
        console.log(`*** done getting pending withdrawals, took ${Math.round(new Date().getTime() - t) / 1000} seconds`);
        for (const l2ToL1Thing of l2ToL1Txns) {
            pendingWithdrawals[l2ToL1Thing.uniqueId.toString()] = l2ToL1Thing;
        }
        setPendingWithdrawalMap(pendingWithdrawals);
        return;
    });
    const getOutGoingMessageState = useCallback((batchNumber, indexInBatch) => __awaiter(void 0, void 0, void 0, function* () {
        if (executedMessagesCache[hashOutgoingMessage(batchNumber, indexInBatch)]) {
            return OutgoingMessageState.EXECUTED;
        }
        else {
            return bridge.getOutGoingMessageState(batchNumber, indexInBatch);
        }
    }), [executedMessagesCache]);
    const addToExecutedMessagesCache = useCallback((batchNumber, indexInBatch) => {
        const _executedMessagesCache = Object.assign({}, executedMessagesCache);
        _executedMessagesCache[hashOutgoingMessage(batchNumber, indexInBatch)] = true;
        setExecutedMessagesCache(_executedMessagesCache);
    }, [executedMessagesCache]);
    const hashOutgoingMessage = (batchNumber, indexInBatch) => {
        return batchNumber.toString() + ',' + indexInBatch.toString();
    };
    return {
        walletAddress,
        bridgeTokens: bridgeTokens,
        balances: {
            eth: ethBalances,
            erc20: erc20Balances,
            erc721: erc721Balances,
            update: updateAllBalances
        },
        cache: {
            erc20: ERC20Cache,
            erc721: ERC721Cache,
            expire: expireCache
        },
        eth: {
            deposit: depositEth,
            withdraw: withdrawEth,
            triggerOutbox: triggerOutboxEth,
            updateBalances: updateEthBalances
        },
        token: {
            add: addToken,
            approve: approveToken,
            deposit: depositToken,
            withdraw: withdrawToken,
            triggerOutbox: triggerOutboxToken,
            updateBalances: updateTokenBalances
        },
        arbSigner: bridge.l2Bridge.l2Signer,
        transactions: {
            transactions,
            clearPendingTransactions,
            setTransactionConfirmed,
            updateTransaction,
            addTransaction
        },
        pendingWithdrawalsMap: pendingWithdrawalsMap,
        setInitialPendingWithdrawals: setInitialPendingWithdrawals
    };
};
