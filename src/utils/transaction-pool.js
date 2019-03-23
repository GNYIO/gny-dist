"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TransactionPool {
    constructor() {
        this.index = new Map();
        this.unConfirmed = [];
    }
    add(trs) {
        this.unConfirmed.push(trs);
        this.index.set(trs.id, this.unConfirmed.length - 1);
    }
    remove(id) {
        const pos = this.index.get(id);
        delete this.index[id];
        this.unConfirmed[pos] = null;
    }
    has(id) {
        const pos = this.index.get(id);
        return pos !== undefined && !!this.unConfirmed[pos];
    }
    getUnconfirmed() {
        const a = [];
        for (let i = 0; i < this.unConfirmed.length; i++) {
            if (this.unConfirmed[i]) {
                a.push(this.unConfirmed[i]);
            }
        }
        return a;
    }
    clear() {
        this.index = new Map();
        this.unConfirmed = [];
    }
    get(id) {
        const pos = this.index.get(id);
        return this.unConfirmed[pos];
    }
}
exports.default = TransactionPool;
//# sourceMappingURL=transaction-pool.js.map