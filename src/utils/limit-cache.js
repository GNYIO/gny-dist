"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DEFAULT_LIMIT = 10000;
class LimitCache {
    constructor() {
        this.cache = new Map();
        this.index = [];
        this.options = {};
        this.limit = DEFAULT_LIMIT;
    }
    set(key, value) {
        if (this.cache.size >= this.limit && !this.cache.has(key)) {
            const dropKey = this.index.shift();
            this.cache.delete(dropKey);
        }
        this.cache.set(key, value);
        this.index.push(key);
    }
    has(key) {
        return this.cache.has(key);
    }
}
exports.default = LimitCache;
//# sourceMappingURL=limit-cache.js.map