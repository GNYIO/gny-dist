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
const ed = require("../../src/utils/ed");
const crypto = require("crypto");
const block_reward_1 = require("../../src/utils/block-reward");
class DelegatesApi {
    constructor(modules, library) {
        this.loaded = false;
        this.blockreward = new block_reward_1.default();
        this.onBlockchainReady = () => {
            this.loaded = true;
        };
        this.attachApi = () => {
            const router = express.Router();
            router.use((req, res, next) => {
                if (this.modules && this.loaded === true)
                    return next();
                return res.status(500).send({ success: false, error: 'Blockchain is loading' });
            });
            router.get('/count', this.count);
            router.get('/voters', this.getVoters);
            router.get('/get', this.getDelegate);
            router.get('/', this.getDelegates);
            if (process.env.DEBUG) {
                router.get('/forging/enableAll', this.forgingEnableAll);
                router.get('/forging/disableAll', this.forgingDisableAll);
            }
            router.post('/forging/enable', this.forgingEnable);
            router.post('/forging/disable', this.forgingDisable);
            router.get('/forging/status', this.forgingStatus);
            router.use((req, res) => {
                res.status(500).send({ success: false, error: 'API endpoint not found' });
            });
            this.library.network.app.use('/api/delegates', router);
            this.library.network.app.use((err, req, res, next) => {
                if (!err)
                    return next();
                this.library.logger.error(req.url, err.toString());
                return res.status(500).send({ success: false, error: err.toString() });
            });
        };
        this.count = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const count = global.app.sdb.getAll('Delegate').length;
                return res.json({ count });
            }
            catch (e) {
                this.library.logger.error('get delegate count error', e);
                return next('Failed to count delegates');
            }
        });
        this.forgingEnableAll = (req, res, next) => {
            this.modules.delegates.enableForging();
            return res.json({ success: true });
        };
        this.forgingDisableAll = (req, res, next) => {
            this.modules.delegates.disableForging();
            return res.json({ success: true });
        };
        this.forgingEnable = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { body } = req;
            const secretAndPublicKey = this.library.joi.object().keys({
                secret: this.library.joi.string().secret().required(),
                publicKey: this.library.joi.string().publicKey(),
            });
            const report = this.library.joi.validate(body, secretAndPublicKey);
            if (report.error) {
                return next(report.error.message);
            }
            const ip = req.connection.remoteAddress;
            if (this.library.config.forging.access.whiteList.length > 0
                && this.library.config.forging.access.whiteList.indexOf(ip) < 0) {
                return next('Access denied');
            }
            const keypair = ed.generateKeyPair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());
            if (body.publicKey) {
                if (keypair.publicKey.toString('hex') !== body.publicKey) {
                    return next('Invalid passphrase');
                }
            }
            const publicKey = keypair.publicKey.toString('hex');
            if (this.modules.delegates.isPublicKeyInKeyPairs(publicKey)) {
                return next('Forging is already enabled');
            }
            const address = this.modules.accounts.generateAddressByPublicKey(publicKey);
            const accountInfo = yield this.modules.accounts.getAccount(address);
            if (typeof accountInfo === 'string') {
                return next(accountInfo.toString());
            }
            if (accountInfo && accountInfo.account.isDelegate) {
                this.modules.delegates.setKeyPair(publicKey, keypair);
                this.library.logger.info(`Forging enabled on account: ${accountInfo.account.address}`);
                return res.json({ success: true });
            }
            return next('Delegate not found');
        });
        this.forgingStatus = (req, res, next) => {
            const { query } = req;
            const needPublicKey = this.library.joi.object().keys({
                publicKey: this.library.joi.string().publicKey().required(),
            });
            const report = this.library.joi.validate(query, needPublicKey);
            if (report.error) {
                return next(report.error.message);
            }
            const isEnabled = !!this.modules.delegates.isPublicKeyInKeyPairs(query.publicKey);
            return res.json({
                success: true,
                enabled: isEnabled
            });
        };
        this.getVoters = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { query } = req;
            const nameSchema = this.library.joi.object().keys({
                username: this.library.joi.string().username().required(),
            });
            const report = this.library.joi.validate(query, nameSchema);
            if (report.error) {
                return next(report.error.message);
            }
            try {
                const votes = yield global.app.sdb.findAll('Vote', { condition: { delegate: query.username } });
                if (!votes || !votes.length)
                    return res.json({ accounts: [] });
                const addresses = votes.map(v => v.address);
                const accounts = yield global.app.sdb.findAll('Account', { condition: { address: { $in: addresses } } });
                const lastBlock = this.modules.blocks.getLastBlock();
                const totalSupply = this.blockreward.calculateSupply(lastBlock.height);
                for (const a of accounts) {
                    a.balance = a.gny;
                    a.weightRatio = (a.weight * 100) / totalSupply;
                }
                return res.json({ accounts });
            }
            catch (e) {
                this.library.logger.error('Failed to find voters', e);
                return next('Server error');
            }
        });
        this.getDelegate = (req, res, next) => {
            const { query } = req;
            const publicKeyOrNameOrAddress = this.library.joi.object().keys({
                publicKey: this.library.joi.string().publicKey(),
                username: this.library.joi.string().username(),
                address: this.library.joi.string().address(),
            });
            const report = this.library.joi.validate(query, publicKeyOrNameOrAddress);
            if (report.error) {
                return next(report.error.message);
            }
            const delegates = this.modules.delegates.getDelegates();
            if (!delegates) {
                return next('no delegates');
            }
            const delegate = delegates.find((one) => {
                if (query.publicKey) {
                    return one.publicKey === query.publicKey;
                }
                if (query.address) {
                    return one.address === query.address;
                }
                if (query.username) {
                    return one.username === query.username;
                }
                return false;
            });
            if (delegate) {
                return res.json({ delegate });
            }
            return next('Delegate not found');
        };
        this.forgingDisable = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { body } = req;
            const secretAndPublicKey = this.library.joi.object().keys({
                secret: this.library.joi.string().secret().required(),
                publicKey: this.library.joi.string().publicKey(),
            });
            const report = this.library.joi.validate(body, secretAndPublicKey);
            if (report.error) {
                return next(report.error.message);
            }
            const ip = req.connection.remoteAddress;
            if (this.library.config.forging.access.whiteList.length > 0
                && this.library.config.forging.access.whiteList.indexOf(ip) < 0) {
                return next('Access denied');
            }
            const keypair = ed.generateKeyPair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());
            if (body.publicKey) {
                if (keypair.publicKey.toString('hex') !== body.publicKey) {
                    return next('Invalid passphrase');
                }
            }
            const publicKey = keypair.publicKey.toString('hex');
            if (!this.modules.delegates.isPublicKeyInKeyPairs(keypair.publicKey.toString('hex'))) {
                return next('Delegate not found');
            }
            const address = this.modules.accounts.generateAddressByPublicKey(publicKey);
            const accountOverview = yield this.modules.accounts.getAccount(address);
            if (typeof accountOverview === 'string') {
                return next(accountOverview.toString());
            }
            if (accountOverview.account && accountOverview.account.isDelegate) {
                this.modules.delegates.removeKeyPair(keypair.publicKey.toString('hex'));
                this.library.logger.info(`Forging disabled on account: ${accountOverview.account.address}`);
                return res.json({ success: true });
            }
            return next('Delegate not found');
        });
        this.getDelegates = (req, res, next) => {
            const { query } = req;
            const offset = Number(query.offset || 0);
            const limit = Number(query.limit || 10);
            if (Number.isNaN(limit) || Number.isNaN(offset)) {
                return next('Invalid params');
            }
            const delegates = this.modules.delegates.getDelegates();
            if (!delegates)
                return next('no delegates found');
            return res.json({
                totalCount: delegates.length,
                delegates: delegates.slice(offset, offset + limit),
            });
        };
        this.modules = modules;
        this.library = library;
        this.attachApi();
    }
}
exports.default = DelegatesApi;
//# sourceMappingURL=delegatesApi.js.map