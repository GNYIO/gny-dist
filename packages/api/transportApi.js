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
const express = require("express");
const slots_1 = require("../../src/utils/slots");
class TransportApi {
    constructor(modules, scope) {
        this.onBind = () => {
            this.headers = {
                os: this.modules.system.getOS(),
                version: this.modules.system.getVersion(),
                port: this.modules.system.getPort(),
                magic: this.modules.system.getMagic(),
            };
        };
        this.attachApi = () => {
            const router = express.Router();
            router.use((req, res, next) => {
                if (this.modules.loader.syncing()) {
                    return res.status(500).json({
                        success: false,
                        error: 'Blockchain is syncing',
                    });
                }
                res.set(this.headers);
                if (req.headers.magic !== this.library.config.magic) {
                    return res.status(500).json({
                        success: false,
                        error: 'Request is made on the wrong network',
                        expected: this.library.config.magic,
                        received: req.headers.magic,
                    });
                }
                return next();
            });
            router.post('/newBlock', this.newBlock);
            router.post('/commonBlock', this.commonBlock);
            router.post('/blocks', this.blocks);
            router.post('/transactions', this.transactions);
            router.post('/votes', this.votes);
            router.post('/getUnconfirmedTransactions', this.getUnconfirmedTransactions);
            router.post('/getHeight', this.getHeight);
            router.use((req, res) => {
                return res.status(500).json({ success: false, error: 'API endpoint not found' });
            });
            this.library.network.app.use('/peer', router);
            this.library.network.app.use((err, req, res, next) => {
                if (!err)
                    return next();
                this.library.logger.error(req.url, err.toString());
                return res.status(500).json({ success: false, error: err.toString() });
            });
        };
        this.newBlock = (req, res, next) => {
            const { body } = req;
            if (!body.id) {
                return next('Invalid params');
            }
            const newBlock = this.modules.transport.latestBlocksCache.get(body.id);
            if (!newBlock) {
                return next('New block not found');
            }
            return res.json({ success: true, block: newBlock.block, votes: newBlock.votes });
        };
        this.commonBlock = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { body } = req;
            if (!Number.isInteger(body.max))
                return next('Field max must be integer');
            if (!Number.isInteger(body.min))
                return next('Field min must be integer');
            const max = body.max;
            const min = body.min;
            const ids = body.ids;
            try {
                let blocks = yield global.app.sdb.getBlocksByHeightRange(min, max);
                if (!blocks || !blocks.length) {
                    return next('Blocks not found');
                }
                blocks = blocks.reverse();
                let commonBlock = null;
                for (const i in ids) {
                    if (blocks[i].id === ids[i]) {
                        commonBlock = blocks[i];
                        break;
                    }
                }
                if (!commonBlock) {
                    return next('Common block not found');
                }
                return res.json({ success: true, common: commonBlock });
            }
            catch (e) {
                global.app.logger.error(`Failed to find common block: ${e}`);
                return next('Failed to find common block');
            }
        });
        this.blocks = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { body } = req;
            let blocksLimit = 200;
            if (body.limit) {
                blocksLimit = Math.min(blocksLimit, Number(body.limit));
            }
            const lastBlockId = body.lastBlockId;
            if (!lastBlockId) {
                return next('Invalid params');
            }
            try {
                const lastBlock = yield global.app.sdb.getBlockById(lastBlockId);
                if (!lastBlock)
                    throw new Error(`Last block not found: ${lastBlockId}`);
                const minHeight = lastBlock.height + 1;
                const maxHeight = (minHeight + blocksLimit) - 1;
                const blocks = yield this.modules.blocks.getBlocks(minHeight, maxHeight, true);
                return res.json({ blocks });
            }
            catch (e) {
                global.app.logger.error('Failed to get blocks or transactions', e);
                return res.json({ blocks: [] });
            }
        });
        this.transactions = (req, res, next) => {
            const lastBlock = this.modules.blocks.getLastBlock();
            const lastSlot = slots_1.default.getSlotNumber(lastBlock.timestamp);
            if (slots_1.default.getNextSlot() - lastSlot >= 12) {
                this.library.logger.error('Blockchain is not ready', {
                    getNextSlot: slots_1.default.getNextSlot(),
                    lastSlot,
                    lastBlockHeight: lastBlock.height,
                });
                return next('Blockchain is not ready');
            }
            let transaction;
            try {
                transaction = this.library.base.transaction.objectNormalize(req.body.transaction);
            }
            catch (e) {
                this.library.logger.error('Received transaction parse error', {
                    raw: req.body,
                    trs: transaction,
                    error: e.toString(),
                });
                return next('Invalid transaction body');
            }
            const finished = (err) => {
                if (err) {
                    this.library.logger.warn(`Receive invalid transaction ${transaction.id}`, err);
                    const errMsg = err.message ? err.message : err.toString();
                    return next(errMsg);
                }
                else {
                    this.library.bus.message('unconfirmedTransaction', transaction);
                    return res.status(200).json({ success: true, transactionId: transaction.id });
                }
            };
            return this.library.sequence.add((cb) => {
                this.library.logger.info(`Received transaction ${transaction.id} from http client`);
                this.modules.transactions.processUnconfirmedTransaction(transaction, cb);
            }, undefined, finished);
        };
        this.votes = (req, res) => {
            this.library.bus.message('receiveVotes', req.body.votes);
            res.json({});
        };
        this.getUnconfirmedTransactions = (req, res) => {
            return res.json({ transactions: this.modules.transactions.getUnconfirmedTransactionList() });
        };
        this.getHeight = (req, res) => {
            return res.json({
                height: this.modules.blocks.getLastBlock().height,
            });
        };
        this.modules = modules;
        this.library = scope;
        this.attachApi();
    }
}
exports.default = TransportApi;
//# sourceMappingURL=transportApi.js.map