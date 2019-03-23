"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse_1 = require("./parse");
function default_1(options) {
    options = options || {
        parser: parseInt
    };
    return function (req, res, next) {
        req.query = parse_1.default(req.query, options);
        next();
    };
}
exports.default = default_1;
//# sourceMappingURL=index.js.map