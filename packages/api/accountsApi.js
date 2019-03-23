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
const Mnemonic = require("bitcore-mnemonic");
const crypto = require("crypto");
class AccountsApi {
    constructor(modules, library) {
        this.attachApi = () => {
            const router = express.Router();
            router.post('/open', this.open2);
            router.get('/getBalance', this.getBalance);
            router.get('/getPublicKey', this.getPublicKey);
            router.post('/generatePublicKey', this.generatePublicKey);
            router.get('/delegates', this.delegates);
            router.get('/', this.getAccount);
            router.get('/new', this.newAccount);
            router.get('/count', this.count);
            router.use((req, res) => {
                return res.status(500).json({ success: false, error: 'API endpoint not found', });
            });
            this.library.network.app.use('/api/accounts', router);
            this.library.network.app.use((err, req, res, next) => {
                if (!err)
                    return next();
                this.library.logger.error(req.url, err);
                return res.status(500).json({
                    success: false,
                    error: err.toString(),
                });
            });
        };
        this.open2 = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { body } = req;
            const publicKeyOrSecret = this.library.joi.object().keys({
                publicKey: this.library.joi.string().publicKey(),
                secret: this.library.joi.string().secret(),
            }).xor('publicKey', 'secret');
            const report = this.library.joi.validate(body, publicKeyOrSecret);
            if (report.error) {
                return next(report.error.message);
            }
            if (body.secret) {
                const result = yield this.openAccount(body.secret);
                if (typeof result === 'string') {
                    return next(result);
                }
                return res.json(result);
            }
            else {
                const result2 = yield this.openAccount2(body.publicKey);
                if (typeof result2 === 'string') {
                    return next(result2);
                }
                return res.json(result2);
            }
        });
        this.getBalance = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { query } = req;
            const hasAddress = this.library.joi.object().keys({
                address: this.library.joi.string().address().required()
            });
            const report = this.library.joi.validate(query, hasAddress);
            if (report.error) {
                return next(report.error.message);
            }
            const accountOverview = yield this.modules.accounts.getAccount(query.address);
            if (typeof accountOverview === 'string') {
                return next(accountOverview);
            }
            const balance = accountOverview && accountOverview.account ? accountOverview.account.balance : 0;
            return res.json({
                balance,
            });
        });
        this.getPublicKey = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { query } = req;
            const isAddress = this.library.joi.object().keys({
                address: this.library.joi.string().address()
            });
            const report = this.library.joi.validate(query, isAddress);
            if (report.error) {
                return next(report.error.message);
            }
            const accountInfoOrError = yield this.modules.accounts.getAccount(query.address);
            if (typeof accountInfoOrError === 'string') {
                return res.json(accountInfoOrError);
            }
            if (!accountInfoOrError.account || !accountInfoOrError.account.publicKey) {
                return next('Account does not have a public key');
            }
            return res.json({ publicKey: accountInfoOrError.account.publicKey });
        });
        this.generatePublicKey = (req, res, next) => {
            const { body } = req;
            const hasSecret = this.library.joi.object().keys({
                secret: this.library.joi.string().secret().required()
            });
            const report = this.library.joi.validate(body, hasSecret);
            if (report.error) {
                return next(report.error.message);
            }
            try {
                const kp = ed.generateKeyPair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());
                const publicKey = kp.publicKey.toString('hex');
                return res.json({ publicKey });
            }
            catch (err) {
                return next('Server error');
            }
        };
        this.delegates = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { query } = req;
            const addressOrAccountName = this.library.joi.object().keys({
                address: this.library.joi.string().address(),
                name: this.library.joi.string().username()
            }).xor('address', 'name');
            const report = this.library.joi.validate(query, addressOrAccountName);
            if (report.error) {
                return next(report.error.message);
            }
            try {
                let addr;
                if (query.name) {
                    const account = yield global.app.sdb.load('Account', { username: query.name });
                    if (!account) {
                        return next('Account not found');
                    }
                    addr = account.address;
                }
                else {
                    addr = query.address;
                }
                const votes = yield global.app.sdb.findAll('Vote', { condition: { address: addr } });
                if (!votes || !votes.length) {
                    return res.json({ delegates: [] });
                }
                const delegateNames = new Set();
                for (const v of votes) {
                    delegateNames.add(v.delegate);
                }
                const delegates = this.modules.delegates.getDelegates();
                if (!delegates || !delegates.length) {
                    return res.json({ delegates: [] });
                }
                const myVotedDelegates = delegates.filter(d => delegateNames.has(d.name));
                return res.json({ delegates: myVotedDelegates });
            }
            catch (e) {
                this.library.logger.error('get voted delegates error', e);
                return next('Server error');
            }
        });
        this.getAccount = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { query } = req;
            const addressOrAccountName = this.library.joi.object().keys({
                address: this.library.joi.string().address(),
                name: this.library.joi.string().username()
            }).xor('address', 'name');
            const report = this.library.joi.validate(query, addressOrAccountName);
            if (report.error) {
                return next(report.error.message);
            }
            if (query.name) {
                const account = yield this.modules.accounts.getAccountByName(query.name);
                if (typeof account === 'string') {
                    return next(account);
                }
                return res.json(account);
            }
            const account = yield this.modules.accounts.getAccount(query.address);
            if (typeof account === 'string') {
                return next(account);
            }
            return res.json(account);
        });
        this.newAccount = (req, res, next) => {
            const entropy = 128;
            const secret = new Mnemonic(entropy).toString();
            const keypair = ed.generateKeyPair(crypto.createHash('sha256').update(secret, 'utf8').digest());
            const address = this.modules.accounts.generateAddressByPublicKey(keypair.publicKey.toString('hex'));
            return res.json({
                secret,
                publicKey: keypair.publicKey.toString('hex'),
                privateKey: keypair.privateKey.toString('hex'),
                address,
            });
        };
        this.count = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const count = yield global.app.sdb.count('Account', {});
                return res.json({ success: true, count });
            }
            catch (e) {
                return next('Server error');
            }
        });
        this.openAccount = (passphrase) => __awaiter(this, void 0, void 0, function* () {
            const hash = crypto.createHash('sha256').update(passphrase, 'utf8').digest();
            const keyPair = ed.generateKeyPair(hash);
            const publicKey = keyPair.publicKey.toString('hex');
            const address = this.modules.accounts.generateAddressByPublicKey(publicKey);
            const accountInfoOrError = yield this.modules.accounts.getAccount(address);
            if (typeof accountInfoOrError === 'string') {
                return accountInfoOrError;
            }
            if (accountInfoOrError && accountInfoOrError.account && !accountInfoOrError.account.publicKey) {
                accountInfoOrError.account.publicKey = publicKey;
            }
            return accountInfoOrError;
        });
        this.openAccount2 = (publicKey) => __awaiter(this, void 0, void 0, function* () {
            const address = this.modules.accounts.generateAddressByPublicKey(publicKey);
            const accountInfoOrError = yield this.modules.accounts.getAccount(address);
            if (typeof accountInfoOrError === 'string') {
                return accountInfoOrError;
            }
            if (accountInfoOrError && accountInfoOrError.account && !accountInfoOrError.account.publicKey) {
                accountInfoOrError.account.publicKey = publicKey;
            }
            return accountInfoOrError;
        });
        this.modules = modules;
        this.library = library;
        this.attachApi();
    }
}
exports.default = AccountsApi;
//# sourceMappingURL=accountsApi.js.map