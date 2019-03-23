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
class BalancesApi {
    constructor(library) {
        this.attachApi = () => {
            const router = express.Router();
            router.get('/:address', this.getBalance);
            router.get('/:address/:currency', this.getAddressCurrencyBalance);
            router.use((req, res) => {
                res.status(500).send({ success: false, error: 'API endpoint not found' });
            });
            this.library.network.app.use('/api/balances', router);
            this.library.network.app.use((err, req, res, next) => {
                if (!err)
                    return next();
                this.library.logger.error(req.url, err);
                return res.status(500).send({ success: false, error: err.toString(), });
            });
        };
        this.getBalance = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const offset = req.query.offset ? Number(req.query.offset) : 0;
            const limit = req.query.limit ? Number(req.query.limit) : 20;
            const condition = { address: req.params.address };
            if (req.query.flag) {
                condition.flag = Number(req.query.flag);
            }
            const count = yield global.app.sdb.count('Balance', condition);
            let balances = [];
            if (count > 0) {
                balances = yield global.app.sdb.findAll('Balance', { condition, limit, offset });
                const currencyMap = new Map();
                for (const b of balances) {
                    currencyMap.set(b.currency, 1);
                }
                const assetNameList = Array.from(currencyMap.keys());
                const uiaNameList = assetNameList.filter(n => n.indexOf('.') !== -1);
                if (uiaNameList && uiaNameList.length) {
                    const assets = yield global.app.sdb.findAll('Asset', {
                        condition: {
                            name: { $in: uiaNameList },
                        },
                    });
                    for (const a of assets) {
                        currencyMap.set(a.name, a);
                    }
                }
                for (const b of balances) {
                    b.asset = currencyMap.get(b.currency);
                }
            }
            return res.json({ count, balances });
        });
        this.getAddressCurrencyBalance = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const currency = req.params.currency;
            const condition = {
                address: req.params.address,
                currency,
            };
            const balance = yield global.app.sdb.findOne('Balance', { condition });
            if (!balance)
                return next('No balance');
            if (currency.indexOf('.') !== -1) {
                balance.asset = yield global.app.sdb.findOne('Asset', { condition: { name: balance.currency } });
            }
            return res.json({ balance });
        });
        this.library = library;
        this.attachApi();
    }
}
exports.default = BalancesApi;
//# sourceMappingURL=balancesApi.js.map