"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    table: 'transactions',
    tableFields: [
        { name: 'id', type: 'String', length: 64, not_null: true, primary_key: true },
        { name: 'type', type: 'Number', not_null: true, index: true },
        { name: 'timestamp', type: 'Number', not_null: true, index: true },
        { name: 'senderId', type: 'String', length: 50, index: true },
        { name: 'senderPublicKey', type: 'String', length: 64 },
        { name: 'fee', type: 'BigInt', not_null: true },
        { name: 'signatures', type: 'Json', not_null: true },
        { name: 'secondSignature', type: 'String', length: 128 },
        { name: 'args', type: 'Json' },
        { name: 'height', type: 'BigInt', not_null: true, index: true },
        { name: 'message', type: 'String', length: 256, index: true },
    ]
};
//# sourceMappingURL=transaction.js.map