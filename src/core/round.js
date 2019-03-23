"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const slots_1 = require("../utils/slots");
class Round {
    constructor(scope) {
        this.isloaded = false;
        this.onBlockChainReady = () => {
            this.isloaded = true;
        };
        this.onFinishRound = (round) => {
            this.library.network.io.sockets.emit('/round/change', { number: round });
        };
        this.cleanup = (cb) => {
            this.library.logger.debug('Cleaning up core/round');
            this.isloaded = false;
            cb();
        };
        this.library = scope;
    }
    getLoadStatus() {
        return this.isloaded;
    }
    calculateRound(height) {
        return Math.floor(height / slots_1.default.delegates) + (height % slots_1.default.delegates > 0 ? 1 : 0);
    }
}
exports.default = Round;
//# sourceMappingURL=round.js.map