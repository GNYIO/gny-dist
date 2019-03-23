"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    table: 'issuers',
    tableFields: [
        { name: 'tid', type: 'String', length: 64, not_null: true, unique: true },
        { name: 'name', type: 'String', length: 32, not_null: true, primary_key: true },
        { name: 'issuerId', type: 'String', length: 50, not_null: true, unique: true },
        { name: 'desc', type: 'Text', not_null: true, length: 4096 }
    ]
};
//# sourceMappingURL=issuer.js.map