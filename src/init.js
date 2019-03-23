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
const fs = require("fs");
const path = require("path");
const os = require("os");
const events_1 = require("events");
const ZSchema = require("z-schema");
const ip = require("ip");
const _ = require("lodash");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const sequence_1 = require("./utils/sequence");
const slots_1 = require("./utils/slots");
const express_query_int_1 = require("./utils/express-query-int");
const zscheme_express_1 = require("./utils/zscheme-express");
const transaction_1 = require("./base/transaction");
const block_1 = require("./base/block");
const consensus_1 = require("./base/consensus");
const protobuf_1 = require("./utils/protobuf");
const loadModules_1 = require("./loadModules");
const loadCoreApi_1 = require("./loadCoreApi");
const initNetwork_1 = require("./initNetwork");
const extendedJoi_1 = require("./utils/extendedJoi");
function getPublicIp() {
    let publicIp;
    try {
        const ifaces = os.networkInterfaces();
        Object.keys(ifaces).forEach((ifname) => {
            ifaces[ifname].forEach((iface) => {
                if (iface.family !== 'IPv4' || iface.internal !== false) {
                    return;
                }
                if (!ip.isPrivate(iface.address)) {
                    publicIp = iface.address;
                }
            });
        });
    }
    catch (e) {
        throw e;
    }
    return publicIp;
}
function isNumberOrNumberString(value) {
    return !(Number.isNaN(value) || Number.isNaN(parseInt(value, 10))
        || String(parseInt(value, 10)) !== String(value));
}
function init_alt(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const scope = {};
        const { appConfig, genesisBlock } = options;
        if (!appConfig.publicIp) {
            appConfig.publicIp = getPublicIp();
        }
        const protoFile = path.join(__dirname, '..', 'proto', 'index.proto');
        if (!fs.existsSync(protoFile)) {
            console.log('Error: Proto file doesn\'t exist!');
            return;
        }
        scope.protobuf = protobuf_1.default.getSchema(protoFile);
        scope.config = appConfig;
        scope.logger = options.logger;
        scope.genesisBlock = genesisBlock;
        scope.scheme = scheme();
        scope.joi = extendedJoi_1.default;
        scope.network = yield initNetwork_1.default(options);
        scope.dbSequence = dbSequence(options);
        scope.sequence = sequence(options);
        scope.balancesSequence = balancesSequence(options);
        {
            const PAYLOAD_LIMIT_SIZE = '8mb';
            scope.network.app.engine('html', require('ejs').renderFile);
            scope.network.app.set('view engine', 'ejs');
            scope.network.app.set('views', scope.config.publicDir);
            scope.network.app.use(scope.network.express.static(scope.config.publicDir));
            scope.network.app.use(bodyParser.raw({ limit: PAYLOAD_LIMIT_SIZE }));
            scope.network.app.use(bodyParser.urlencoded({
                extended: true,
                limit: PAYLOAD_LIMIT_SIZE,
                parameterLimit: 5000,
            }));
            scope.network.app.use(bodyParser.json({ limit: PAYLOAD_LIMIT_SIZE }));
            scope.network.app.use(methodOverride());
            const ignore = [
                'id', 'name', 'lastBlockId', 'blockId',
                'transactionId', 'address', 'recipientId',
                'senderId', 'previousBlock',
            ];
            scope.network.app.use(express_query_int_1.default({
                parser(value, radix, name) {
                    if (ignore.indexOf(name) >= 0) {
                        return value;
                    }
                    if (!isNumberOrNumberString(value)) {
                        return value;
                    }
                    return Number.parseInt(value, radix);
                },
            }));
            scope.network.app.use(zscheme_express_1.default(scope.scheme));
            scope.network.app.use((req, res, next) => {
                const parts = req.url.split('/');
                const host = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                scope.logger.debug(`receive request: ${req.method} ${req.url} from ${host}`);
                res.setHeader('X-Frame-Options', 'DENY');
                res.setHeader('Content-Security-Policy', 'frame-ancestors \'none\'');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Length,  X-Requested-With, Content-Type, Accept, request-node-status');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD, PUT, DELETE');
                if (req.method === 'OPTIONS') {
                    res.sendStatus(200);
                    scope.logger.debug('Response pre-flight request');
                    return;
                }
                const URI_PREFIXS = ['api', 'peer'];
                const isApiOrPeer = parts.length > 1 && (URI_PREFIXS.indexOf(parts[1]) !== -1);
                const { whiteList } = scope.config.api.access;
                const { blackList } = scope.config.peers;
                const forbidden = isApiOrPeer && ((whiteList.length > 0 && whiteList.indexOf(ip) < 0)
                    || (blackList.length > 0 && blackList.indexOf(ip) >= 0));
                if (isApiOrPeer && forbidden) {
                    res.sendStatus(403);
                }
                else if (isApiOrPeer && req.headers['request-node-status'] === 'yes') {
                    const lastBlock = scope.modules.blocks.getLastBlock();
                    res.setHeader('Access-Control-Expose-Headers', 'node-status');
                    res.setHeader('node-status', JSON.stringify({
                        blockHeight: lastBlock.height,
                        blockTime: slots_1.default.getRealTime(lastBlock.timestamp),
                        blocksBehind: slots_1.default.getNextSlot() - (slots_1.default.getSlotNumber(lastBlock.timestamp) + 1),
                        version: scope.modules.peer.getVersion(),
                    }));
                    next();
                }
                else {
                    next();
                }
            });
            scope.network.server.listen(scope.config.port, scope.config.address, (err) => {
                scope.logger.log(`Server started: ${scope.config.address}:${scope.config.port}`);
                if (!err) {
                    scope.logger.log(`Error: ${err}`);
                }
            });
        }
        scope.base = {
            bus: scope.bus,
            scheme: scope.scheme,
            genesisBlock: scope.genesisBlock,
            consensus: new consensus_1.Consensus(scope),
            transaction: new transaction_1.Transaction(scope),
            block: new block_1.Block(scope),
        };
        global.library = scope;
        scope.modules = loadModules_1.default(scope);
        scope.coreApi = loadCoreApi_1.default(scope.modules, scope);
        class Bus extends events_1.EventEmitter {
            message(topic, ...restArgs) {
                Object.keys(scope.modules).forEach((moduleName) => {
                    const module = scope.modules[moduleName];
                    const eventName = `on${_.chain(topic).camelCase().upperFirst().value()}`;
                    if (typeof (module[eventName]) === 'function') {
                        module[eventName].apply(module[eventName], [...restArgs]);
                    }
                });
                Object.keys(scope.coreApi).forEach((apiName) => {
                    const oneApi = scope.coreApi[apiName];
                    const eventName = `on${_.chain(topic).camelCase().upperFirst().value()}`;
                    if (typeof (oneApi[eventName]) === 'function') {
                        oneApi[eventName].apply(oneApi[eventName], [...restArgs]);
                    }
                });
                this.emit(topic, ...restArgs);
            }
        }
        scope.bus = new Bus();
        return scope;
    });
}
function scheme() {
    ZSchema.registerFormat('hex', (str) => {
        let b;
        try {
            b = Buffer.from(str, 'hex');
        }
        catch (e) {
            return false;
        }
        return b && b.length > 0;
    });
    ZSchema.registerFormat('publicKey', (str) => {
        if (str.length === 0) {
            return true;
        }
        try {
            const publicKey = Buffer.from(str, 'hex');
            return publicKey.length === 32;
        }
        catch (e) {
            return false;
        }
    });
    ZSchema.registerFormat('splitarray', (str) => {
        try {
            const a = str.split(',');
            return a.length > 0 && a.length <= 1000;
        }
        catch (e) {
            return false;
        }
    });
    ZSchema.registerFormat('signature', (str) => {
        if (str.length === 0) {
            return true;
        }
        try {
            const signature = Buffer.from(str, 'hex');
            return signature.length === 64;
        }
        catch (e) {
            return false;
        }
    });
    ZSchema.registerFormat('checkInt', value => !isNumberOrNumberString(value));
    return new ZSchema({});
}
function dbSequence(options) {
    return new sequence_1.default({
        name: 'db',
        onWarning: (current) => {
            options.logger.warn(`DB sequence ${current}`);
        },
    });
}
function sequence(options) {
    return new sequence_1.default({
        name: 'normal',
        onWarning: (current) => {
            options.logger.warn(`Main sequence ${current}`);
        },
    });
}
function balancesSequence(options) {
    return new sequence_1.default({
        name: 'balance',
        onWarning: (current) => {
            options.logger.warn(`Balance sequence ${current}`);
        },
    });
}
exports.default = init_alt;
//# sourceMappingURL=init.js.map