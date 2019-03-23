"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Mnemonic = require("bitcore-mnemonic");
const address_1 = require("./address");
const Joi = require("joi");
const stringExtensions = {
    base: Joi.string(),
    name: 'string',
    language: {
        publicKey: 'is not in the format of a 32 char long hex string buffer',
        secret: 'is not BIP39 complient',
        address: 'is not a GNY address',
        username: 'is not an GNY username',
        issuer: 'is not a valid GNY issuer name',
        asset: 'is not a valid GNY asset name',
    },
    rules: [{
            name: 'publicKey',
            validate(params, value, state, options) {
                try {
                    const x = Buffer.from(value, 'hex');
                    if (x.length === 32)
                        return value;
                    else
                        return this.createError('string.publicKey', { v: value }, state, options);
                }
                catch (err) {
                    return this.createError('string.publicKey', { v: value }, state, options);
                }
            }
        },
        {
            name: 'secret',
            validate(params, value, state, options) {
                const result = Mnemonic.isValid(value);
                if (result === false)
                    return this.createError('string.secret', { v: value }, state, options);
                return value;
            }
        },
        {
            name: 'address',
            validate(params, value, state, options) {
                const result = address_1.isAddress(value);
                if (!result) {
                    return this.createError('string.address', { v: value }, state, options);
                }
                return value;
            }
        },
        {
            name: 'username',
            validate(params, value, state, options) {
                const regname = /^[a-z0-9_]{2,20}$/;
                if (!regname.test(value))
                    return this.createError('string.username', { v: value }, state, options);
                return value;
            }
        },
        {
            name: 'issuer',
            validate(params, value, state, options) {
                const regname = /^[A-Za-z]{1,16}$/;
                if (!regname.test(value))
                    return this.createError('string.issuer', { v: value }, state, options);
                return value;
            }
        },
        {
            name: 'asset',
            validate(params, value, state, options) {
                const regname = /^[A-Za-z]{1,16}.[A-Z]{3,6}$/;
                if (!regname.test(value))
                    return this.createError('string.asset', { v: value }, state, options);
                return value;
            }
        }]
};
const newJoi = Joi.extend(stringExtensions);
exports.default = newJoi;
//# sourceMappingURL=extendedJoi.js.map