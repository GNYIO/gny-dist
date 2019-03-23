"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const bs58 = require("bs58");
exports.default = {
    generateAddress,
    isAddress
};
function generateAddress(publicKey) {
    const PREFIX = 'G';
    const hash1 = crypto.createHash('sha256').update(Buffer.from(publicKey, 'hex')).digest();
    const hash2 = crypto.createHash('ripemd160').update(hash1).digest();
    return PREFIX + bs58.encode(hash2);
}
exports.generateAddress = generateAddress;
function isAddress(address) {
    if (typeof address !== 'string') {
        return false;
    }
    try {
        if (address.length === 0) {
            return false;
        }
        if (!bs58.decode(address.slice(1))) {
            return false;
        }
    }
    catch (err) {
        return false;
    }
    if (address[0] !== 'G') {
        return false;
    }
    return true;
}
exports.isAddress = isAddress;
//# sourceMappingURL=address.js.map