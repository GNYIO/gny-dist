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
const LRU = require("lru-cache");
const slots_1 = require("../utils/slots");
class Transport {
    constructor(scope) {
        this.latestBlocksCache = new LRU(200);
        this.blockHeaderMidCache = new LRU(1000);
        this.broadcast = (topic, message, recursive) => {
            this.modules.peer.publish(topic, message, recursive);
        };
        this.onBind = (scope) => {
            this.modules = scope;
        };
        this.onPeerReady = () => {
            this.modules.peer.subscribe('newBlockHeader', (message, peer) => {
                if (this.modules.loader.syncing()) {
                    return;
                }
                const lastBlock = this.modules.blocks.getLastBlock();
                if (!lastBlock) {
                    this.library.logger.error('Last block not exists');
                    return;
                }
                const body = message.body;
                if (!body || !body.id || !body.height || !body.prevBlockId) {
                    this.library.logger.error('Invalid message body');
                    return;
                }
                const height = body.height;
                const id = body.id.toString('hex');
                const prevBlockId = body.prevBlockId.toString('hex');
                if (height !== lastBlock.height + 1 || prevBlockId !== lastBlock.id) {
                    this.library.logger.warn('New block donnot match with last block', message);
                    if (height > lastBlock.height + 5) {
                        this.library.logger.warn('Receive new block header from long fork');
                    }
                    else {
                        this.modules.loader.syncBlocksFromPeer(peer);
                    }
                    return;
                }
                this.library.logger.info('Receive new block header', { height, id });
                this.modules.peer.requestCB('newBlock', { id }, peer, (err, result) => {
                    if (err) {
                        this.library.logger.error('Failed to get latest block data', err);
                        return;
                    }
                    if (!result || !result.block || !result.votes) {
                        this.library.logger.error('Invalid block data', result);
                        return;
                    }
                    try {
                        let block = result.block;
                        let votes = this.library.protobuf.decodeBlockVotes(Buffer.from(result.votes, 'base64'));
                        block = this.library.base.block.objectNormalize(block);
                        votes = this.library.base.consensus.normalizeVotes(votes);
                        this.latestBlocksCache.set(block.id, result);
                        this.blockHeaderMidCache.set(block.id, message);
                        this.library.bus.message('receiveBlock', block, votes);
                    }
                    catch (e) {
                        this.library.logger.error(`normalize block or votes object error: ${e.toString()}`, result);
                    }
                });
            });
            this.modules.peer.subscribe('propose', (message) => {
                try {
                    const propose = this.library.protobuf.decodeBlockPropose(message.body.propose);
                    this.library.bus.message('receivePropose', propose);
                }
                catch (e) {
                    this.library.logger.error('Receive invalid propose', e);
                }
            });
            this.modules.peer.subscribe('transaction', (message) => {
                if (this.modules.loader.syncing()) {
                    return;
                }
                const lastBlock = this.modules.blocks.getLastBlock();
                const lastSlot = slots_1.default.getSlotNumber(lastBlock.timestamp);
                if (slots_1.default.getNextSlot() - lastSlot >= 12) {
                    this.library.logger.error('Blockchain is not ready', { getNextSlot: slots_1.default.getNextSlot(), lastSlot, lastBlockHeight: lastBlock.height });
                    return;
                }
                let transaction;
                try {
                    transaction = message.body.transaction;
                    if (Buffer.isBuffer(transaction))
                        transaction = transaction.toString();
                    transaction = JSON.parse(transaction);
                    transaction = this.library.base.transaction.objectNormalize(transaction);
                }
                catch (e) {
                    this.library.logger.error('Received transaction parse error', {
                        message,
                        error: e.toString(),
                    });
                    return;
                }
                this.library.sequence.add((cb) => {
                    this.library.logger.info(`Received transaction ${transaction.id} from remote peer`);
                    this.modules.transactions.processUnconfirmedTransaction(transaction, cb);
                }, (err) => {
                    if (err) {
                        this.library.logger.warn(`Receive invalid transaction ${transaction.id}`, err);
                    }
                    else {
                    }
                });
            });
        };
        this.onUnconfirmedTransaction = (transaction) => {
            const message = {
                body: {
                    transaction: JSON.stringify(transaction),
                },
            };
            this.broadcast('transaction', message);
        };
        this.onNewBlock = (block, votes) => {
            this.latestBlocksCache.set(block.id, {
                block,
                votes: this.library.protobuf.encodeBlockVotes(votes).toString('base64'),
            });
            const message = this.blockHeaderMidCache.get(block.id) || {
                body: {
                    id: Buffer.from(block.id, 'hex'),
                    height: block.height,
                    prevBlockId: Buffer.from(block.prevBlockId, 'hex'),
                },
            };
            this.broadcast('newBlockHeader', message, 0);
        };
        this.onNewPropose = (propose) => {
            const message = {
                body: {
                    propose: this.library.protobuf.encodeBlockPropose(propose),
                },
            };
            this.broadcast('propose', message);
        };
        this.sendVotes = (votes, address) => __awaiter(this, void 0, void 0, function* () {
            const parts = address.split(':');
            const contact = {
                host: parts[0],
                port: parts[1],
            };
            try {
                const result = yield this.modules.peer.request('votes', { votes }, contact);
            }
            catch (err) {
                this.library.logger.error('send votes error', err);
            }
        });
        this.cleanup = (cb) => {
            this.library.logger.debug('Cleaning up core/transport');
            cb();
        };
        this.message = (msg, cb) => {
            msg.timestamp = (new Date()).getTime();
            cb(null, {});
        };
        this.library = scope;
    }
}
exports.default = Transport;
//# sourceMappingURL=transport.js.map