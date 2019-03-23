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
exports.default = {
    registerIssuer(name, desc) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!/^[A-Za-z]{1,16}$/.test(name))
                return 'Invalid issuer name';
            if (!desc)
                return 'No issuer description was provided';
            const descJson = JSON.stringify(desc);
            if (descJson.length > 4096)
                return 'Invalid issuer description';
            const senderId = this.sender.address;
            global.app.sdb.lock(`uia.registerIssuer@${senderId}`);
            let exists = yield global.app.sdb.exists('Issuer', { name });
            if (exists)
                return 'Issuer name already exists';
            exists = yield global.app.sdb.exists('Issuer', { issuerId: senderId });
            if (exists)
                return 'Account is already an issuer';
            global.app.sdb.create('Issuer', {
                tid: this.trs.id,
                issuerId: senderId,
                name,
                desc: descJson,
            });
            return null;
        });
    },
    registerAsset(symbol, desc, maximum, precision) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!/^[A-Z]{3,6}$/.test(symbol))
                return 'Invalid symbol';
            if (desc.length > 4096)
                return 'Invalid asset description';
            if (!Number.isInteger(precision) || precision <= 0)
                return 'Precision should be positive integer';
            if (precision > 16 || precision < 0)
                return 'Invalid asset precision';
            global.app.validate('amount', maximum);
            const issuer = yield global.app.sdb.findOne('Issuer', { condition: { issuerId: this.sender.address } });
            if (!issuer)
                return 'Account is not an issuer';
            const fullName = `${issuer.name}.${symbol}`;
            global.app.sdb.lock(`uia.registerAsset@${fullName}`);
            const exists = yield global.app.sdb.exists('Asset', { name: fullName });
            if (exists)
                return 'Asset already exists';
            global.app.sdb.create('Asset', {
                tid: this.trs.id,
                name: fullName,
                timestamp: this.trs.timestamp,
                desc,
                maximum,
                precision,
                quantity: '0',
                issuerId: this.sender.address,
            });
            return null;
        });
    },
    issue(name, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!/^[A-Za-z]{1,16}.[A-Z]{3,6}$/.test(name))
                return 'Invalid currency';
            global.app.validate('amount', amount);
            const asset = yield global.app.sdb.findOne('Asset', { condition: { name } });
            if (!asset)
                return 'Asset not exists';
            global.app.sdb.lock(`uia.issue@${name}`);
            if (asset.issuerId !== this.sender.address)
                return 'Permission denied';
            const quantity = global.app.util.bignumber(asset.quantity).plus(amount);
            if (quantity.gt(asset.maximum))
                return 'Exceed issue limit';
            asset.quantity = quantity.toString(10);
            global.app.sdb.update('Asset', { quantity: asset.quantity }, { name });
            global.app.balances.increase(this.sender.address, name, amount);
            return null;
        });
    },
    transfer(currency, amount, recipient) {
        return __awaiter(this, void 0, void 0, function* () {
            if (currency.length > 30)
                return 'Invalid currency';
            if (!recipient || recipient.length > 50)
                return 'Invalid recipient';
            global.app.validate('amount', String(amount));
            const senderId = this.sender.address;
            const balance = global.app.balances.get(senderId, currency);
            if (balance.lt(amount))
                return 'Insufficient balance';
            let recipientAddress;
            let recipientName = '';
            if (recipient && global.app.util.address.isAddress(recipient)) {
                recipientAddress = recipient;
            }
            else {
                recipientName = recipient;
                const recipientAccount = yield global.app.sdb.findOne('Account', { condition: { username: recipient } });
                if (!recipientAccount)
                    return 'Recipient name not exist';
                recipientAddress = recipientAccount.address;
            }
            global.app.balances.transfer(currency, amount, senderId, recipientAddress);
            global.app.sdb.create('Transfer', {
                tid: this.trs.id,
                height: this.block.height,
                senderId,
                recipientId: recipientAddress,
                recipientName,
                currency,
                amount,
                timestamp: this.trs.timestamp,
            });
            return null;
        });
    },
};
//# sourceMappingURL=uia.js.map