"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    table: 'variables',
    memory: true,
    tableFields: [
        {
            name: 'key',
            type: 'String',
            length: 256,
            not_null: true,
            primary_key: true
        },
        {
            name: 'value',
            type: 'Text',
            not_null: true
        }
    ]
};
//# sourceMappingURL=variable.js.map