"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = zscheme => (req, res, next) => {
    req.sanitize = function sanitize(value, scheme, callback) {
        return zscheme.validate(value, scheme, (err, valid) => callback(null, {
            isValid: valid,
            issues: err ? `${err[0].message}: ${err[0].path}` : null,
        }, value));
    };
    next();
};
//# sourceMappingURL=zscheme-express.js.map