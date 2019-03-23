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
const path = require("path");
const ip = require("ip");
const crypto = require("crypto");
const DHT = require("bittorrent-dht");
const requestLib = require("request");
const axios_1 = require("axios");
const util_1 = require("util");
const Database = require("nedb");
const SAVE_PEERS_INTERVAL = 1 * 60 * 1000;
const CHECK_BUCKET_OUTDATE = 1 * 60 * 1000;
const MAX_BOOTSTRAP_PEERS = 25;
class Peer {
    constructor(scope) {
        this.handlers = {};
        this.dht = null;
        this.nodesDb = undefined;
        this.shared = {};
        this.getNodeIdentity = (node) => {
            const address = `${node.host}:${node.port}`;
            return crypto.createHash('ripemd160').update(address).digest().toString('hex');
        };
        this.getSeedPeerNodes = (seedPeers) => {
            return seedPeers.map(peer => {
                const node = {
                    host: peer.ip,
                    port: Number(peer.port),
                };
                node.id = this.getNodeIdentity(node);
                return node;
            });
        };
        this.getBootstrapNodes = (seedPeers, lastNodes, maxCount) => {
            const nodeMap = new Map();
            this.getSeedPeerNodes(seedPeers).forEach(node => nodeMap.set(node.id, node));
            lastNodes.forEach(node => {
                if (!nodeMap.has(node.id)) {
                    nodeMap.set(node.id, node);
                }
            });
            return [...nodeMap.values()].slice(0, maxCount);
        };
        this.initDHT = (p2pOptions) => __awaiter(this, void 0, void 0, function* () {
            p2pOptions = p2pOptions || {};
            let lastNodes = [];
            if (p2pOptions.persistentPeers) {
                const peerNodesDbPath = path.join(p2pOptions.peersDbDir, 'peers.db');
                try {
                    lastNodes = yield util_1.promisify(this.initNodesDb)(peerNodesDbPath);
                    lastNodes = lastNodes || [];
                    global.app.logger.debug(`load last node peers success, ${JSON.stringify(lastNodes)}`);
                }
                catch (e) {
                    global.app.logger.error('Last nodes not found', e);
                }
            }
            const bootstrapNodes = this.getBootstrapNodes(p2pOptions.seedPeers, lastNodes, MAX_BOOTSTRAP_PEERS);
            const dht = new DHT({
                timeBucketOutdated: CHECK_BUCKET_OUTDATE,
                bootstrap: true,
                id: this.getNodeIdentity({ host: p2pOptions.publicIp, port: p2pOptions.peerPort })
            });
            this.dht = dht;
            const port = p2pOptions.peerPort;
            dht.listen(port, () => this.library.logger.info(`p2p server listen on ${port}`));
            dht.on('node', (node) => {
                const nodeId = node.id.toString('hex');
                this.library.logger.info(`add node (${nodeId}) ${node.host}:${node.port}`);
                this.updateNode(nodeId, node);
            });
            dht.on('remove', (nodeId, reason) => {
                this.library.logger.info(`remove node (${nodeId}), reason: ${reason}`);
                this.removeNode(nodeId);
            });
            dht.on('error', (err) => {
                this.library.logger.warn('dht error message', err);
            });
            dht.on('warning', (msg) => {
                this.library.logger.warn('dht warning message', msg);
            });
            if (p2pOptions.eventHandlers)
                Object.keys(p2pOptions.eventHandlers).forEach(eventName => dht.on(eventName, p2pOptions.eventHandlers[eventName]));
            bootstrapNodes.forEach(n => dht.addNode(n));
        });
        this.findSeenNodesInDb = (callback) => {
            this.nodesDb.find({ seen: { $exists: true } }).sort({ seen: -1 }).exec(callback);
        };
        this.initNodesDb = (peerNodesDbPath, cb) => {
            if (!this.nodesDb) {
                const db = new Database({ filename: peerNodesDbPath, autoload: true });
                this.nodesDb = db;
                db.persistence.setAutocompactionInterval(SAVE_PEERS_INTERVAL);
                const errorHandler = (err) => err && global.app.logger.info('peer node index error', err);
                db.ensureIndex({ fieldName: 'id' }, errorHandler);
                db.ensureIndex({ fieldName: 'seen' }, errorHandler);
            }
            this.findSeenNodesInDb(cb);
        };
        this.updateNode = (nodeId, node, callback) => {
            if (!nodeId || !node)
                return;
            const upsertNode = Object.assign({}, node);
            upsertNode.id = nodeId;
            this.nodesDb.update({ id: nodeId }, upsertNode, { upsert: true }, (err, data) => {
                if (err)
                    global.app.logger.warn(`faild to update node (${nodeId}) ${node.host}:${node.port}`);
                callback && callback(err, data);
            });
        };
        this.removeNode = (nodeId, callback) => {
            if (!nodeId)
                return;
            this.nodesDb.remove({ id: nodeId }, (err, numRemoved) => {
                if (err)
                    global.app.logger.warn(`faild to remove node id (${nodeId})`);
                callback && callback(err, numRemoved);
            });
        };
        this.list = (options, cb) => {
            options.limit = options.limit || 100;
            return cb(null, []);
        };
        this.remove = (pip, port, cb) => {
            const peers = this.library.config.peers.list;
            const isFrozenList = peers.find((peer) => peer.ip === ip.fromLong(pip) && peer.port === port);
            if (isFrozenList !== undefined)
                return cb && cb('Peer in white list');
            return cb();
        };
        this.getVersion = () => ({
            version: this.library.config.version,
            build: this.library.config.buildVersion,
            net: this.library.config.netVersion,
        });
        this.isCompatible = (version) => {
            const nums = version.split('.').map(Number);
            if (nums.length !== 3) {
                return true;
            }
            let compatibleVersion = '0.0.0';
            if (this.library.config.netVersion === 'testnet') {
                compatibleVersion = '1.2.3';
            }
            else if (this.library.config.netVersion === 'mainnet') {
                compatibleVersion = '1.3.1';
            }
            const numsCompatible = compatibleVersion.split('.').map(Number);
            for (let i = 0; i < nums.length; ++i) {
                if (nums[i] < numsCompatible[i]) {
                    return false;
                }
                if (nums[i] > numsCompatible[i]) {
                    return true;
                }
            }
            return true;
        };
        this.subscribe = (topic, handler) => {
            this.handlers[topic] = handler;
        };
        this.onpublish = (msg, peer) => {
            if (!msg || !msg.topic || !this.handlers[msg.topic.toString()]) {
                this.library.logger.debug('Receive invalid publish message topic', msg);
                return;
            }
            this.handlers[msg.topic](msg, peer);
        };
        this.publish = (topic, message, recursive = 1) => {
            if (!this.dht) {
                this.library.logger.warn('dht network is not ready');
                return;
            }
            message.topic = topic;
            message.recursive = recursive;
            this.dht.broadcast(message);
        };
        this.request = (endpoint, httpParams, contact, timeout) => __awaiter(this, void 0, void 0, function* () {
            const address = `${contact.host}:${contact.port - 1}`;
            const uri = `http://${address}/peer/${endpoint}`;
            this.library.logger.debug(`start to request ${uri}`);
            const headers = {
                magic: global.Config.magic,
                version: global.Config.version,
            };
            let result;
            try {
                const config = {
                    headers: headers,
                    responseType: 'json',
                    timeout: undefined || timeout
                };
                result = yield axios_1.default.post(uri, httpParams, config);
                if (result.status !== 200) {
                    throw new Error(`Invalid status code: ${result.statusCode}`);
                }
                return result.data;
            }
            catch (err) {
                this.library.logger.error(`Failed to request remote peer: ${err}`);
                throw err;
            }
        });
        this.requestCB = (method, params, contact, cb) => {
            const address = `${contact.host}:${contact.port - 1}`;
            const uri = `http://${address}/peer/${method}`;
            this.library.logger.debug(`start to request ${uri}`);
            const reqOptions = {
                uri,
                method: 'POST',
                body: params,
                headers: {
                    magic: global.Config.magic,
                    version: global.Config.version,
                },
                json: true,
            };
            requestLib(reqOptions, (err, response, result) => {
                if (err) {
                    return cb(`Failed to request remote peer: ${err}`);
                }
                else if (response.statusCode !== 200) {
                    this.library.logger.debug('remote service error', result);
                    return cb(`Invalid status code: ${response.statusCode}`);
                }
                return cb(null, result);
            });
        };
        this.randomRequestAsync = (method, params) => __awaiter(this, void 0, void 0, function* () {
            const randomNode = this.dht.getRandomNode();
            if (!randomNode)
                throw new Error('no contact');
            this.library.logger.debug('select random contract', randomNode);
            try {
                const result = yield this.request(method, params, randomNode, 4000);
                return result;
            }
            catch (err) {
                throw err;
            }
        });
        this.randomRequest = (method, params, cb) => {
            const randomNode = this.dht.getRandomNode();
            if (!randomNode)
                return cb('No contact');
            this.library.logger.debug('select random contract', randomNode);
            let isCallbacked = false;
            setTimeout(() => {
                if (isCallbacked)
                    return;
                isCallbacked = true;
                cb('Timeout', undefined, randomNode);
            }, 4000);
            return this.requestCB(method, params, randomNode, (err, result) => {
                if (isCallbacked)
                    return;
                isCallbacked = true;
                cb(err, result, randomNode);
            });
        };
        this.onBind = (scope) => {
            this.modules = scope;
        };
        this.onBlockchainReady = () => {
            this.initDHT({
                publicIp: this.library.config.publicIp,
                peerPort: this.library.config.peerPort,
                seedPeers: this.library.config.peers.list,
                persistentPeers: this.library.config.peers.persistent === false ? false : true,
                peersDbDir: global.Config.dataDir,
                eventHandlers: {
                    'broadcast': (msg, node) => this.onpublish(msg, node)
                }
            }).then(() => {
                this.library.bus.message('peerReady');
            }).catch(err => {
                this.library.logger.error('Failed to init dht', err);
            });
        };
        this.library = scope;
    }
}
exports.default = Peer;
//# sourceMappingURL=peer.js.map