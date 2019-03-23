"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const limit_cache_1 = require("../utils/limit-cache");
const addressHelper = require("../utils/address");
const transaction_mode_1 = require("../utils/transaction-mode");
const transaction_pool_1 = require("../utils/transaction-pool");
class Transactions {
    constructor(scope) {
        this.getUnconfirmedTransaction = (id) => this.pool.get(id);
        this.getUnconfirmedTransactionList = () => this.pool.getUnconfirmed();
        this.removeUnconfirmedTransaction = (id) => this.pool.remove(id);
        this.hasUnconfirmed = (id) => this.pool.has(id);
        this.clearUnconfirmed = () => this.pool.clear();
        this.getUnconfirmedTransactions = (cb) => setImmediate(cb, null, { transactions: this.getUnconfirmedTransactionList() });
        this.getTransactions = (req, cb) => {
            const query = req.body;
            const limit = query.limit ? Number(query.limit) : 100;
            const offset = query.offset ? Number(query.offset) : 0;
            const condition = {};
            if (query.senderId) {
                condition.senderId = query.senderId;
            }
            if (query.type) {
                condition.type = Number(query.type);
            }
            (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const count = yield global.app.sdb.count('Transaction', condition);
                    let transactions = yield global.app.sdb.find('Transaction', condition, { limit, offset });
                    if (!transactions)
                        transactions = [];
                    return cb(null, { transactions, count });
                }
                catch (e) {
                    global.app.logger.error('Failed to get transactions', e);
                    return cb(`System error: ${e}`);
                }
            }))();
        };
        this.getTransaction = (req, cb) => {
            (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (!req.params || !req.params.id)
                        return cb('Invalid transaction id');
                    const id = req.params.id;
                    const trs = yield global.app.sdb.find('Transaction', { id });
                    if (!trs || !trs.length)
                        return cb('Transaction not found');
                    return cb(null, { transaction: trs[0] });
                }
                catch (e) {
                    return cb(`System error: ${e}`);
                }
            }))();
        };
        this.applyTransactionsAsync = (transactions) => __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < transactions.length; ++i) {
                yield this.applyUnconfirmedTransactionAsync(transactions[i]);
            }
        });
        this.processUnconfirmedTransactions = (transactions, cb) => {
            (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    for (const transaction of transactions) {
                        yield this.processUnconfirmedTransactionAsync(transaction);
                    }
                    cb(null, transactions);
                }
                catch (e) {
                    cb(e.toString(), transactions);
                }
            }))();
        };
        this.processUnconfirmedTransactionsAsync = (transactions) => __awaiter(this, void 0, void 0, function* () {
            for (const transaction of transactions) {
                yield this.processUnconfirmedTransactionAsync(transaction);
            }
        });
        this.processUnconfirmedTransaction = (transaction, cb) => {
            (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield this.processUnconfirmedTransactionAsync(transaction);
                    cb(null, transaction);
                }
                catch (e) {
                    cb(e.toString(), transaction);
                }
            }))();
        };
        this.processUnconfirmedTransactionAsync = (transaction) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!transaction.id) {
                    transaction.id = this.library.base.transaction.getId(transaction);
                }
                else {
                    const id = this.library.base.transaction.getId(transaction);
                    if (transaction.id !== id) {
                        throw new Error('Invalid transaction id');
                    }
                }
                if (this.modules.blocks.isCollectingVotes()) {
                    throw new Error('Block consensus in processing');
                }
                if (this.failedTrsCache.has(transaction.id)) {
                    throw new Error('Transaction already processed');
                }
                if (this.pool.has(transaction.id)) {
                    throw new Error('Transaction already in the pool');
                }
                const exists = yield global.app.sdb.exists('Transaction', { id: transaction.id });
                if (exists) {
                    throw new Error('Transaction already confirmed');
                }
                yield this.applyUnconfirmedTransactionAsync(transaction);
                this.pool.add(transaction);
                return transaction;
            }
            catch (e) {
                this.failedTrsCache.set(transaction.id, true);
                throw e;
            }
        });
        this.applyUnconfirmedTransactionAsync = (transaction) => __awaiter(this, void 0, void 0, function* () {
            this.library.logger.debug('apply unconfirmed trs', transaction);
            const height = this.modules.blocks.getLastBlock().height;
            const block = {
                height: height + 1,
            };
            const senderId = transaction.senderId;
            const requestorId = transaction.requestorId;
            if (!senderId) {
                throw new Error('Missing sender address');
            }
            const mode = transaction.mode;
            if (transaction_mode_1.default.isRequestMode(mode)) {
                if (!requestorId)
                    throw new Error('No requestor provided');
                if (requestorId === senderId)
                    throw new Error('Sender should not be equal to requestor');
                if (!transaction.senderPublicKey)
                    throw new Error('Requestor public key not provided');
            }
            else if (transaction_mode_1.default.isDirectMode(mode)) {
                if (requestorId)
                    throw new Error('RequestId should not be provided');
                if (global.app.util.address.isAddress(senderId)
                    && !transaction.senderPublicKey) {
                    throw new Error('Sender public key not provided');
                }
            }
            else {
                throw new Error('Unexpected transaction mode');
            }
            let requestor = null;
            let sender = yield global.app.sdb.load('Account', senderId);
            if (!sender) {
                if (height > 0)
                    throw new Error('Sender account not found');
                sender = global.app.sdb.create('Account', {
                    address: senderId,
                    name: null,
                    gny: 0,
                });
            }
            if (requestorId) {
                if (!global.app.util.address.isAddress(requestorId)) {
                    throw new Error('Invalid requestor address');
                }
                requestor = yield global.app.sdb.load('Account', requestorId);
                if (!requestor) {
                    throw new Error('Requestor account not found');
                }
            }
            else {
                requestor = sender;
            }
            if (transaction.senderPublicKey) {
                const signerId = transaction.requestorId || transaction.senderId;
                const generatedAddress = addressHelper.generateAddress(transaction.senderPublicKey);
                if (generatedAddress !== signerId) {
                    throw new Error('Invalid senderPublicKey');
                }
            }
            const context = {
                trs: transaction,
                block,
                sender,
                requestor,
            };
            if (height > 0) {
                const error = yield this.library.base.transaction.verify(context);
                if (error)
                    throw new Error(error);
            }
            try {
                global.app.sdb.beginContract();
                yield this.library.base.transaction.apply(context);
                global.app.sdb.commitContract();
            }
            catch (e) {
                global.app.sdb.rollbackContract();
                this.library.logger.error(e);
                throw e;
            }
        });
        this.onBind = (scope) => {
            this.modules = scope;
        };
        this.library = scope;
        this.pool = new transaction_pool_1.default();
        this.failedTrsCache = new limit_cache_1.default();
    }
}
exports.default = Transactions;
//# sourceMappingURL=transactions.js.map