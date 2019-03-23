"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const runtime_1 = require("./src/runtime");
const init_1 = require("./src/init");
function verifyGenesisBlock(scope, block) {
    try {
        const payloadHash = crypto.createHash('sha256');
        for (let i = 0; i < block.transactions.length; i++) {
            const trs = block.transactions[i];
            const bytes = scope.base.transaction.getBytes(trs);
            payloadHash.update(bytes);
        }
        const id = scope.base.block.getId(block);
        assert.equal(payloadHash.digest().toString('hex'), block.payloadHash, 'Unexpected payloadHash');
        assert.equal(id, block.id, 'Unexpected block id');
    }
    catch (e) {
        throw e;
    }
}
class Application {
    constructor(options) {
        this.options = options;
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const options = this.options;
            const pidFile = options.pidFile;
            const scope = yield init_1.default(options);
            function cb(err, result) {
                if (err)
                    return console.log(err);
            }
            process.once('cleanup', () => {
                scope.logger.info('Cleaning up...');
                try {
                    for (const key in scope.modules) {
                        if (scope.modules[key].hasOwnProperty('cleanup')) {
                            scope.modules[key].cleanup(cb);
                        }
                    }
                    global.app.sdb.close();
                    scope.logger.info('Clean up successfully.');
                }
                catch (e) {
                    scope.logger.error(`Error while cleaning up: ${e}`);
                }
                if (fs.existsSync(pidFile)) {
                    fs.unlinkSync(pidFile);
                }
                process.exit(1);
            });
            process.once('SIGTERM', () => {
                process.emit('cleanup');
            });
            process.once('exit', () => {
                scope.logger.info('process exited');
            });
            process.once('SIGINT', () => {
                process.emit('cleanup');
            });
            process.on('uncaughtException', (err) => {
                scope.logger.fatal('uncaughtException', { message: err.message, stack: err.stack });
                process.emit('cleanup');
            });
            process.on('unhandledRejection', (err) => {
                scope.logger.error('unhandledRejection', err);
                process.emit('cleanup');
            });
            verifyGenesisBlock(scope, scope.genesisBlock);
            options.library = scope;
            try {
                yield runtime_1.default(options);
            }
            catch (e) {
                scope.logger.error('init runtime error: ', e);
                process.exit(1);
                return;
            }
            scope.bus.message('bind', scope.modules);
            scope.logger.info('Modules ready and launched');
            if (!scope.config.publicIp) {
                scope.logger.warn('Failed to get public ip, block forging MAY not work!');
            }
        });
    }
}
exports.default = Application;
//# sourceMappingURL=index.js.map