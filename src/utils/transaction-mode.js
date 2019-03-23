"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isDirectMode(mode) {
    return (mode === undefined || mode === null || mode === 0);
}
function isRequestMode(mode) {
    return mode === 1;
}
exports.default = {
    DIRECT: 0,
    REQUEST: 1,
    isDirectMode,
    isRequestMode,
};
//# sourceMappingURL=transaction-mode.js.map