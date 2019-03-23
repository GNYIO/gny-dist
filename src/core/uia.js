"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsonSql = require("json-sql");
jsonSql().setDialect('sqlite');
class UIA {
    constructor(scope) {
        this.onBind = (scope) => {
            this.modules = scope;
        };
        this.library = scope;
    }
}
exports.default = UIA;
//# sourceMappingURL=uia.js.map