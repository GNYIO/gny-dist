"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const slots_1 = require("../utils/slots");
class System {
    constructor(scope) {
        this.library = scope;
    }
    getOS() {
        return os.platform() + os.release();
    }
    getVersion() {
        return global.Config.version;
    }
    getPort() {
        return global.Config.port;
    }
    getMagic() {
        return global.Config.magic;
    }
    getSystemInfo() {
        const lastBlock = this.library.blocks.getLastBlock();
        return {
            os: `${os.platform()}_${os.release()}`,
            version: this.library.config.version,
            timestamp: Date.now(),
            lastBlock: {
                height: lastBlock.height,
                timestamp: slots_1.default.getRealTime(lastBlock.timestamp),
                behind: slots_1.default.getNextSlot() - (slots_1.default.getSlotNumber(lastBlock.timestamp) + 1),
            },
        };
    }
}
exports.default = System;
//# sourceMappingURL=system.js.map