"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AutoIncrement {
    constructor(sdb) {
        this.sdb = sdb;
    }
    get(key) {
        const item = this.sdb.ge('Variable', key);
        const value = item ? item.value : '0';
        return value;
    }
    increment(key) {
        let item = this.sdb.get('Variable', key);
        if (item) {
            item.value = global.app.util.bignumber(item.value).plus(1).toString();
            this.sdb.update('Variable', { value: item.value }, key);
        }
        else {
            item = this.sdb.create('Variable', { key, value: '1' });
        }
        return item.value;
    }
}
exports.default = AutoIncrement;
//# sourceMappingURL=auto-increment.js.map