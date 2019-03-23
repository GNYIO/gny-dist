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
const addressHelper = require("../utils/address");
class Account {
    constructor(scope) {
        this.generateAddressByPublicKey = (publicKey) => {
            return addressHelper.generateAddress(publicKey);
        };
        this.getAccountByName = (name) => __awaiter(this, void 0, void 0, function* () {
            try {
                const account = yield global.app.sdb.findOne('Account', {
                    condition: { username: name }
                });
                return account;
            }
            catch (err) {
                return 'Server Error';
            }
        });
        this.getAccount = (address) => __awaiter(this, void 0, void 0, function* () {
            const report = this.library.scheme.validate(address, {
                type: 'string',
                minLength: 1,
                maxLength: 50,
            });
            if (!report) {
                return 'address must be between 1 and 50 chars long';
            }
            try {
                const account = yield global.app.sdb.findOne('Account', {
                    condition: { address }
                });
                let accountData;
                if (!account) {
                    accountData = {
                        address: address,
                        balance: 0,
                        secondPublicKey: '',
                        lockHeight: 0,
                        isDelegate: 0
                    };
                }
                else {
                    accountData = {
                        address: account.address,
                        balance: account.gny,
                        secondPublicKey: account.secondPublicKey,
                        lockHeight: account.lockHeight || 0,
                        isDelegate: account.isDelegate,
                    };
                }
                const latestBlock = this.modules.blocks.getLastBlock();
                const ret = {
                    account: accountData,
                    latestBlock: {
                        height: latestBlock.height,
                        timestamp: latestBlock.timestamp,
                    },
                    version: this.modules.peer.getVersion(),
                };
                return ret;
            }
            catch (e) {
                this.library.logger.error('Failed to get account', e);
                return 'Server Error';
            }
        });
        this.onBind = (scope) => {
            this.modules = scope;
        };
        this.library = scope;
    }
}
exports.default = Account;
//# sourceMappingURL=accounts.js.map