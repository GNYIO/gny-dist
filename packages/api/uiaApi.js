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
const address_1 = require("../../src/utils/address");
const express = require("express");
class UiaApi {
    constructor(modules, scope) {
        this.attachApi = () => {
            const router = express.Router();
            router.use((req, res, next) => {
                if (this.modules)
                    return next();
                return res.status(500).json({ success: false, error: 'Blockchain is loading' });
            });
            router.get('/issuers', this.getIssuers);
            router.get('/issuers/:name', this.getIssuer);
            router.get('/issuers/:name/assets', this.getIssuerAssets);
            router.get('/assets', this.getAssets);
            router.get('/assets/:name', this.getAsset);
            router.get('/balances/:address', this.getBalances);
            router.get('/balances/:address/:currency', this.getBalance);
            router.use((req, res) => {
                res.status(500).json({ success: false, error: 'API endpoint not found' });
            });
            this.library.network.app.use('/api/uia', router);
            this.library.network.app.use((err, req, res, next) => {
                if (!err)
                    return next();
                this.library.logger.error(req.url, err);
                return res.status(500).json({ success: false, error: err.toString() });
            });
        };
        this.getIssuers = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { query } = req;
            const limitOffset = this.library.joi.object().keys({
                limit: this.library.joi.number().min(0).max(100),
                offset: this.library.joi.number().min(0),
            });
            const report = this.library.joi.validate(query, limitOffset);
            if (report.error) {
                return next(report.error.message);
            }
            try {
                const limitAndOffset = { limit: query.limit || 100, offset: query.offset || 0 };
                const count = yield global.app.sdb.count('Issuer', {});
                const issues = yield global.app.sdb.find('Issuer', {}, limitAndOffset);
                return res.json({ count, issues });
            }
            catch (dbErr) {
                return next(`Failed to get issuers: ${dbErr}`);
            }
        });
        this.getIssuer = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const query = req.params;
            const nameMustBeNameOrAddress = this.library.joi.object().keys({
                name: [
                    this.library.joi.string().issuer(),
                    this.library.joi.string().address()
                ],
            });
            const report = this.library.joi.validate(query, nameMustBeNameOrAddress);
            if (report.error) {
                return next(report.error.message);
            }
            const name = query.name;
            try {
                if (address_1.default.isAddress(name)) {
                    const issuer = yield global.app.sdb.findOne('Issuer', { condition: { issuerId: name } });
                    if (!issuer) {
                        return next('Issuer not found');
                    }
                    return res.json({ issuer });
                }
                else {
                    const issuers = yield global.app.sdb.find('Issuer', { name: req.params.name });
                    if (!issuers || issuers.length === 0)
                        return next('Issuer not found');
                    return res.json({ issuer: issuers[0] });
                }
            }
            catch (err) {
                return next(err.toString());
            }
        });
        this.getIssuerAssets = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const nameSchema = this.library.joi.object().keys({
                name: this.library.joi.string().issuer().required(),
            });
            const nameReport = this.library.joi.validate(req.params, nameSchema);
            if (nameReport.error) {
                return next(nameReport.error.message);
            }
            const { query } = req;
            const limitOffset = this.library.joi.object().keys({
                limit: this.library.joi.number().min(0).max(100),
                offset: this.library.joi.number().min(0),
            });
            const report = this.library.joi.validate(query, limitOffset);
            if (report.error) {
                return next(report.error.message);
            }
            try {
                const issuerName = req.params.name;
                const issuer = yield global.app.sdb.findOne('Issuer', { condition: { name: issuerName } });
                if (!issuer) {
                    return next(`Issuer "${issuer}" not found`);
                }
                const limitAndOffset = { limit: query.limit || 100, offset: query.offset || 0 };
                const condition = { issuerId: issuer.issuerId };
                const count = yield global.app.sdb.count('Asset', condition);
                const assets = yield global.app.sdb.find('Asset', condition, limitAndOffset);
                return res.json({ count, assets: assets });
            }
            catch (dbErr) {
                return next(`Failed to get assets: ${dbErr}`);
            }
        });
        this.getAssets = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { query } = req;
            const limitOffset = this.library.joi.object().keys({
                limit: this.library.joi.number().min(0).max(100),
                offset: this.library.joi.number().min(0),
            });
            const report = this.library.joi.validate(query, limitOffset);
            if (report.error) {
                return next(report.error.message);
            }
            try {
                const condition = {};
                const limitAndOffset = { limit: query.limit || 100, offset: query.offset || 0 };
                const count = yield global.app.sdb.count('Asset', condition);
                const assets = yield global.app.sdb.find('Asset', condition, limitAndOffset);
                return res.json({ count, assets: assets });
            }
            catch (dbErr) {
                return next(`Failed to get assets: ${dbErr}`);
            }
        });
        this.getAsset = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const query = req.params;
            const nameSchema = this.library.joi.object().keys({
                name: this.library.joi.string().asset().required(),
            });
            const report = this.library.joi.validate(query, nameSchema);
            if (report.error) {
                return next(report.error.message);
            }
            try {
                const condition = { name: query.name };
                const assets = yield global.app.sdb.find('Asset', condition);
                if (!assets || assets.length === 0)
                    return next('Asset not found');
                return res.json({ asset: assets[0] });
            }
            catch (dbErr) {
                return next(`Failed to get asset: ${dbErr}`);
            }
        });
        this.getBalances = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const addressSchema = this.library.joi.object().keys({
                address: this.library.joi.string().address().required(),
            });
            const addressReport = this.library.joi.validate(req.params, addressSchema);
            if (addressReport.error) {
                return next(addressReport.error.message);
            }
            const { query } = req;
            const limitOffset = this.library.joi.object().keys({
                limit: this.library.joi.number().min(0).max(100),
                offset: this.library.joi.number().min(0),
            });
            const report = this.library.joi.validate(query, limitOffset);
            if (report.error) {
                return next(report.error.message);
            }
            try {
                const condition = { address: req.params.address };
                const count = yield global.app.sdb.count('Balance', condition);
                const resultRange = { limit: query.limit, offset: query.offset };
                const balances = yield global.app.sdb.find('Balance', condition, resultRange);
                return res.json({ count, balances: balances });
            }
            catch (dbErr) {
                return next(`Failed to get balances: ${dbErr}`);
            }
        });
        this.getBalance = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const schema = this.library.joi.object().keys({
                address: this.library.joi.string().address().required(),
                currency: this.library.joi.string().asset().required(),
            });
            const report = this.library.joi.validate(req.params, schema);
            if (report.error) {
                return next(report.error.message);
            }
            try {
                const condition = { address: req.params.address, currency: req.params.currency };
                const balances = yield global.app.sdb.find('Balance', condition);
                if (!balances || balances.length === 0)
                    return next('Balance info not found');
                return res.json({ balance: balances[0] });
            }
            catch (dbErr) {
                return next(`Failed to get issuers: ${dbErr}`);
            }
        });
        this.modules = modules;
        this.library = scope;
        this.attachApi();
    }
}
exports.default = UiaApi;
//# sourceMappingURL=uiaApi.js.map