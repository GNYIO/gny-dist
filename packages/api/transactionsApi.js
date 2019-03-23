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
const crypto = require("crypto");
const ed = require("../../src/utils/ed");
const express = require("express");
class TransactionsApi {
    constructor(modules, scope) {
        this.attachApi = () => {
            const router = express.Router();
            router.use((req, res, next) => {
                if (this.modules)
                    return next();
                return res.status(500).json({ success: false, error: 'Blockchain is loading' });
            });
            router.get('/', this.getTransactions);
            router.get('/unconfirmed/get', this.getUnconfirmedTransaction);
            router.get('/unconfirmed', this.getUnconfirmedTransactions);
            router.put('/', this.addTransactionUnsigned);
            router.put('/batch', this.addTransactions);
            router.use((req, res) => {
                res.status(500).json({ success: false, error: 'API endpoint not found' });
            });
            this.library.network.app.use('/api/transactions', router);
            this.library.network.app.use((err, req, res, next) => {
                if (!err)
                    return next();
                this.library.logger.error(req.url, err.toString());
                return res.status(500).json({ success: false, error: err.toString() });
            });
        };
        this.getTransactions = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { query } = req;
            const schema = this.library.joi.object().keys({
                limit: this.library.joi.number().min(0).max(100),
                offset: this.library.joi.number().min(0),
                id: this.library.joi.string().min(1).max(100),
                senderId: this.library.joi.string().address(),
                senderPublicKey: this.library.joi.string().publicKey(),
                blockId: this.library.joi.string().min(1).max(100)
                    .when('height', {
                    is: this.library.joi.exist(),
                    then: this.library.joi.forbidden(),
                }),
                type: this.library.joi.number().min(0).max(1000),
                height: this.library.joi.number().min(0),
                message: this.library.joi.string(),
            });
            const report = this.library.joi.validate(query, schema);
            if (report.error) {
                return next(report.error.message);
            }
            const limit = query.limit || 100;
            const offset = query.offset || 0;
            const condition = {};
            if (query.senderId) {
                condition.senderId = query.senderId;
            }
            if (query.senderPublicKey) {
                condition.senderPublicKey = query.senderPublicKey;
            }
            if (query.type !== undefined) {
                condition.type = query.type;
            }
            if (query.id) {
                condition.id = query.id;
            }
            if (query.message) {
                condition.message = query.message;
            }
            if (query.height) {
                condition.height = query.height;
            }
            try {
                let block;
                if (query.blockId) {
                    block = yield global.app.sdb.getBlockById(query.blockId);
                    if (block === undefined) {
                        return res.json({ transactions: [], count: 0 });
                    }
                    condition.height = block.height;
                }
                const count = yield global.app.sdb.count('Transaction', condition);
                let transactions = yield global.app.sdb.find('Transaction', condition, { limit, offset });
                if (!transactions)
                    transactions = [];
                return res.json({ transactions, count });
            }
            catch (e) {
                global.app.logger.error('Failed to get transactions', e);
                return next(`System error: ${e}`);
            }
        });
        this.getUnconfirmedTransaction = (req, res, next) => {
            const { query } = req;
            const typeSchema = this.library.joi.object().keys({
                id: this.library.joi.string().min(1).max(64).required(),
            });
            const report = this.library.joi.validate(query, typeSchema);
            if (report.error) {
                return next(report.error.message);
            }
            const unconfirmedTransaction = this.modules.transactions.getUnconfirmedTransaction(query.id);
            return !unconfirmedTransaction
                ? next('Transaction not found')
                : res.json({ transaction: unconfirmedTransaction });
        };
        this.getUnconfirmedTransactions = (req, res, next) => {
            const { query } = req;
            const publicKeyAddress = this.library.joi.object().keys({
                senderPublicKey: this.library.joi.string().publicKey(),
                address: this.library.joi.string().address(),
            });
            const report = this.library.joi.validate(query, publicKeyAddress);
            if (report.error) {
                return next(report.error.message);
            }
            const transactions = this.modules.transactions.getUnconfirmedTransactionList();
            const toSend = [];
            if (query.senderPublicKey || query.address) {
                for (let i = 0; i < transactions.length; i++) {
                    if (transactions[i].senderPublicKey === query.senderPublicKey
                        || transactions[i].recipientId === query.address) {
                        toSend.push(transactions[i]);
                    }
                }
            }
            else {
                transactions.forEach(t => toSend.push(t));
            }
            return res.json({ transactions: toSend });
        };
        this.addTransactionUnsigned = (req, res, next) => {
            const query = req.body;
            const transactionSchema = this.library.joi.object().keys({
                secret: this.library.joi.string().secret().required(),
                secondSecret: this.library.joi.string().secret(),
                fee: this.library.joi.number().min(1).required(),
                type: this.library.joi.number().min(0).required(),
                args: this.library.joi.array(),
                message: this.library.joi.string(),
                senderId: this.library.joi.string().address(),
            });
            const report = this.library.joi.validate(query, transactionSchema);
            if (report.error) {
                this.library.logger.warn('Failed to validate query params', report.error.message);
                return setImmediate(next, (report.error.message));
            }
            const finishSequence = (err, result) => {
                if (err) {
                    return next(err);
                }
                res.json(result);
            };
            this.library.sequence.add((callback) => {
                (() => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const hash = crypto.createHash('sha256').update(query.secret, 'utf8').digest();
                        const keypair = ed.generateKeyPair(hash);
                        let secondKeypair = null;
                        if (query.secondSecret) {
                            secondKeypair = ed.generateKeyPair(crypto.createHash('sha256').update(query.secondSecret, 'utf8').digest());
                        }
                        const trs = this.library.base.transaction.create({
                            secret: query.secret,
                            fee: query.fee,
                            type: query.type,
                            senderId: query.senderId || null,
                            args: query.args || null,
                            message: query.message || null,
                            secondKeypair,
                            keypair,
                            mode: query.mode,
                        });
                        yield this.modules.transactions.processUnconfirmedTransactionAsync(trs);
                        this.library.bus.message('unconfirmedTransaction', trs);
                        callback(null, { transactionId: trs.id });
                    }
                    catch (e) {
                        this.library.logger.warn('Failed to process unsigned transaction', e);
                        callback(e.toString());
                    }
                }))();
            }, undefined, finishSequence);
        };
        this.addTransactions = (req, res, next) => {
            if (!req.body || !req.body.transactions) {
                return next('Invalid params');
            }
            const finishedCallback = (err, result) => {
                if (err) {
                    return next(err);
                }
                return res.json({ success: true, transactions: result });
            };
            const trs = req.body.transactions;
            try {
                for (const t of trs) {
                    this.library.base.transaction.objectNormalize(t);
                }
            }
            catch (e) {
                return next(`Invalid transaction body: ${e.toString()}`);
            }
            return this.library.sequence.add((callback) => {
                this.modules.transactions.processUnconfirmedTransactions(trs, callback);
            }, undefined, finishedCallback);
        };
        this.modules = modules;
        this.library = scope;
        this.attachApi();
    }
}
exports.default = TransactionsApi;
//# sourceMappingURL=transactionsApi.js.map