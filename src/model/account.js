"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    table: 'accounts',
    tableFields: [
        { name: 'address', type: 'String', length: 50, primary_key: true, not_null: true },
        { name: 'username', type: 'String', length: 20, unique: true },
        { name: 'gny', type: 'BigInt', default: 0 },
        { name: 'publicKey', type: 'String', length: 64 },
        { name: 'secondPublicKey', type: 'String', length: 64 },
        { name: 'isDelegate', type: 'Number', default: 0 },
        { name: 'isLocked', type: 'Number', default: 0 },
        { name: 'lockHeight', type: 'BigInt', default: 0 },
        { name: 'lockAmount', type: 'BigInt', default: 0 },
    ]
};
//# sourceMappingURL=account.js.map