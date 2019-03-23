"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Server {
    constructor(scope) {
        this.isLoaded = false;
        this.onBlockchainReady = () => {
            this.isLoaded = true;
        };
        this.cleanup = (cb) => {
            this.library.logger.debug('Cleaning up core/server');
            this.isLoaded = false;
            cb();
        };
        this.library = scope;
    }
}
exports.default = Server;
//# sourceMappingURL=server.js.map