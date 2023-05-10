import { L2ToL1MessageStatus as OutgoingMessageState } from '@arbitrum/sdk';
export { OutgoingMessageState };
export var TokenType;
(function (TokenType) {
    TokenType["ERC20"] = "ERC20";
})(TokenType || (TokenType = {}));
export var AssetType;
(function (AssetType) {
    AssetType["ERC20"] = "ERC20";
    AssetType["ETH"] = "ETH";
})(AssetType || (AssetType = {}));
export var NodeBlockDeadlineStatusTypes;
(function (NodeBlockDeadlineStatusTypes) {
    NodeBlockDeadlineStatusTypes[NodeBlockDeadlineStatusTypes["NODE_NOT_CREATED"] = 0] = "NODE_NOT_CREATED";
    NodeBlockDeadlineStatusTypes[NodeBlockDeadlineStatusTypes["EXECUTE_CALL_EXCEPTION"] = 1] = "EXECUTE_CALL_EXCEPTION";
})(NodeBlockDeadlineStatusTypes || (NodeBlockDeadlineStatusTypes = {}));
