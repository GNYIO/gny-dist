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
class TransfersApi {
    constructor(library) {
        this.attachApi = () => {
            const router = express.Router();
            router.get('/', this.getRoot);
            router.get('/amount', this.getAmount);
            router.use((req, res) => {
                return res.status(500).send({ success: false, error: 'API endpoint not found' });
            });
            this.library.network.app.use('/api/transfers', router);
            this.library.network.app.use((err, req, res, next) => {
                if (!err)
                    return next();
                this.library.logger.error(req.url, err.toString());
                return res.status(500).send({ success: false, error: err.toString() });
            });
        };
        this.getRoot = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const condition = {};
            const ownerId = req.query.ownerId;
            const currency = req.query.currency;
            const limit = Number(req.query.limit) || 10;
            const offset = Number(req.query.offset) || 0;
            if (ownerId) {
                condition.$or = {
                    senderId: ownerId,
                    recipientId: ownerId,
                };
            }
            if (currency) {
                condition.currency = currency;
            }
            if (req.query.senderId) {
                condition.senderId = req.query.senderId;
            }
            if (req.query.recipientId) {
                condition.recipientId = req.query.recipientId;
            }
            const count = yield global.app.sdb.count('Transfer', condition);
            let transfers = [];
            if (count > 0) {
                transfers = yield global.app.sdb.findAll('Transfer', {
                    condition,
                    limit,
                    offset,
                    sort: { timestamp: -1 },
                });
                const assetNames = new Set();
                for (const t of transfers) {
                    if (t.currency !== 'GNY') {
                        assetNames.add(t.currency);
                    }
                }
                const assetMap = yield this.getAssetMap(assetNames);
                const tids = transfers.map(t => t.tid);
                const trsMap = yield this.getTransactionMap(tids);
                for (const t of transfers) {
                    if (t.currency !== 'GNY') {
                        t.asset = assetMap.get(t.currency);
                    }
                    t.transaction = trsMap.get(t.tid);
                }
            }
            for (const t of transfers) {
                if (t.amount) {
                    const pos = t.amount.indexOf('.');
                    if (pos !== -1) {
                        t.amount = t.amount.slice(0, pos);
                    }
                }
            }
            return res.json({ count, transfers });
        });
        this.getAmount = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const startTimestamp = req.query.startTimestamp;
            const endTimestamp = req.query.endTimestamp;
            const condition = {};
            if (startTimestamp && endTimestamp) {
                condition.timestamp = { $between: [startTimestamp, endTimestamp] };
            }
            condition.currency = 'GNY';
            const count = yield global.app.sdb.count('Transfer', condition);
            let transfers = [];
            if (count > 0) {
                transfers = yield global.app.sdb.findAll('Transfer', {
                    condition,
                    sort: { timestamp: -1 },
                });
                const assetNames = new Set();
                for (const t of transfers) {
                    if (t.currency !== 'GNY') {
                        assetNames.add(t.currency);
                    }
                }
                const assetMap = yield this.getAssetMap(assetNames);
                const tids = transfers.map(t => t.tid);
                const trsMap = yield this.getTransactionMap(tids);
                for (const t of transfers) {
                    if (t.currency !== 'GNY') {
                        t.asset = assetMap.get(t.currency);
                    }
                    t.transaction = trsMap.get(t.tid);
                }
            }
            let totalAmount = 0;
            for (const t of transfers) {
                if (t.amount) {
                    const pos = t.amount.indexOf('.');
                    if (pos !== -1) {
                        t.amount = t.amount.slice(0, pos);
                    }
                    totalAmount += Number(t.amount);
                }
            }
            const strTotalAmount = String(totalAmount);
            return res.json({ count, strTotalAmount });
        });
        this.getAssetMap = (assetNames) => __awaiter(this, void 0, void 0, function* () {
            const assetMap = new Map();
            const assetNameList = Array.from(assetNames.keys());
            const uiaNameList = assetNameList.filter(n => n.indexOf('.') !== -1);
            if (uiaNameList && uiaNameList.length) {
                const assets = yield global.app.sdb.findAll('Asset', {
                    condition: {
                        name: { $in: uiaNameList },
                    },
                });
                for (const a of assets) {
                    assetMap.set(a.name, a);
                }
            }
            return assetMap;
        });
        this.getTransactionMap = (tids) => __awaiter(this, void 0, void 0, function* () {
            const trsMap = new Map();
            const trs = yield global.app.sdb.findAll('Transaction', {
                condition: {
                    id: { $in: tids },
                },
            });
            for (const t of trs) {
                trsMap.set(t.id, t);
            }
            return trsMap;
        });
        this.library = library;
        this.attachApi();
    }
}
exports.default = TransfersApi;
//# sourceMappingURL=transfersApi.js.map