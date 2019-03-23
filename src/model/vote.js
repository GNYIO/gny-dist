"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    table: 'votes',
    tableFields: [
        { name: 'voterAddress', type: 'String', length: 50, not_null: true, composite_key: true },
        { name: 'delegate', type: 'String', length: 50, not_null: true, composite_key: true },
    ]
};
//# sourceMappingURL=vote.js.map