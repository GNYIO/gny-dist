"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
class Slots {
    constructor() {
        this.delegates = constants_1.DELEGATES;
    }
    getEpochTime(time) {
        if (time === undefined) {
            time = Date.now();
        }
        return Math.floor((time - constants_1.EPOCH_TIME.getTime()) / 1000);
    }
    getTime(time) {
        return this.getEpochTime(time);
    }
    getRealTime(epochTime) {
        if (epochTime === undefined) {
            epochTime = this.getTime(undefined);
        }
        const start = Math.floor(constants_1.EPOCH_TIME.getTime() / 1000) * 1000;
        return start + epochTime * 1000;
    }
    getSlotNumber(epochTime) {
        if (epochTime === undefined) {
            epochTime = this.getTime(undefined);
        }
        return Math.floor(epochTime / constants_1.INTERVAL);
    }
    getSlotTime(slot) {
        return slot * constants_1.INTERVAL;
    }
    getNextSlot() {
        return this.getSlotNumber(undefined) + 1;
    }
    getLastSlot(nextSlot) {
        return nextSlot + constants_1.DELEGATES;
    }
    roundTime(date) {
        return Math.floor(date.getTime() / 1000) * 1000;
    }
}
exports.default = new Slots();
//# sourceMappingURL=slots.js.map