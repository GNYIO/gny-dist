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
const async = require("async");
const constants = require("../utils/constants");
const slots_1 = require("../utils/slots");
const addressHelper = require("../utils/address");
const transaction_mode_1 = require("../utils/transaction-mode");
const block_reward_1 = require("../utils/block-reward");
class Blocks {
    constructor(scope) {
        this.lastBlock = {};
        this.loaded = false;
        this.blockCache = {};
        this.proposeCache = {};
        this.lastPropose = null;
        this.privIsCollectingVotes = false;
        this.blockreward = new block_reward_1.default();
        this.getCommonBlock = (peer, height) => __awaiter(this, void 0, void 0, function* () {
            const lastBlockHeight = height;
            let data;
            try {
                data = yield this.getIdSequence2(lastBlockHeight);
            }
            catch (e) {
                return (`Failed to get this.last block id sequence${e}`);
            }
            this.library.logger.trace('getIdSequence=========', data);
            const params = {
                max: lastBlockHeight,
                min: data.firstHeight,
                ids: data.ids,
            };
            let ret;
            try {
                ret = yield this.modules.peer.request('commonBlock', params, peer);
            }
            catch (err) {
                return err.toString();
            }
            if (!ret.common) {
                return 'Common block not found';
            }
            return ret.common;
        });
        this.setLastBlock = (block) => {
            this.lastBlock = block;
        };
        this.getLastBlock = () => this.lastBlock;
        this.verifyBlock = (block, options) => __awaiter(this, void 0, void 0, function* () {
            try {
                block.id = this.library.base.block.getId(block);
            }
            catch (e) {
                throw new Error(`Failed to get block id: ${e.toString()}`);
            }
            this.library.logger.debug(`verifyBlock, id: ${block.id}, h: ${block.height}`);
            if (!block.prevBlockId && block.height !== 0) {
                throw new Error('Previous block should not be null');
            }
            try {
                if (!this.library.base.block.verifySignature(block)) {
                    throw new Error('Failed to verify block signature');
                }
            }
            catch (e) {
                this.library.logger.error({ e, block });
                throw new Error(`Got exception while verify block signature: ${e.toString()}`);
            }
            if (block.prevBlockId !== this.lastBlock.id) {
                throw new Error('Incorrect previous block hash');
            }
            if (block.height !== 0) {
                const blockSlotNumber = slots_1.default.getSlotNumber(block.timestamp);
                const lastBlockSlotNumber = slots_1.default.getSlotNumber(this.lastBlock.timestamp);
                if (blockSlotNumber > slots_1.default.getSlotNumber() + 1 || blockSlotNumber <= lastBlockSlotNumber) {
                    throw new Error(`Can't verify block timestamp: ${block.id}`);
                }
            }
            if (block.transactions.length > constants.maxTxsPerBlock) {
                throw new Error(`Invalid amount of block assets: ${block.id}`);
            }
            if (block.transactions.length !== block.count) {
                throw new Error('Invalid transaction count');
            }
            const payloadHash = crypto.createHash('sha256');
            const appliedTransactions = {};
            let totalFee = 0;
            for (const transaction of block.transactions) {
                totalFee += transaction.fee;
                let bytes;
                try {
                    bytes = this.library.base.transaction.getBytes(transaction);
                }
                catch (e) {
                    throw new Error(`Failed to get transaction bytes: ${e.toString()}`);
                }
                if (appliedTransactions[transaction.id]) {
                    throw new Error(`Duplicate transaction id in block ${block.id}`);
                }
                appliedTransactions[transaction.id] = transaction;
                payloadHash.update(bytes);
            }
            if (totalFee !== block.fees) {
                throw new Error('Invalid total fees');
            }
            const expectedReward = this.blockreward.calculateReward(block.height);
            if (expectedReward !== block.reward) {
                throw new Error('Invalid block reward');
            }
            if (options.votes) {
                const votes = options.votes;
                if (block.height !== votes.height) {
                    throw new Error('Votes height is not correct');
                }
                if (block.id !== votes.id) {
                    throw new Error('Votes id is not correct');
                }
                if (!votes.signatures || !this.library.base.consensus.hasEnoughVotesRemote(votes)) {
                    throw new Error('Votes signature is not correct');
                }
                yield this.verifyBlockVotes(block, votes);
            }
        });
        this.verifyBlockVotes = (block, votes) => __awaiter(this, void 0, void 0, function* () {
            const delegateList = this.modules.delegates.generateDelegateList(block.height);
            const publicKeySet = new Set(delegateList);
            for (const item of votes.signatures) {
                if (!publicKeySet.has(item.key.toString('hex'))) {
                    throw new Error(`Votes key is not in the top list: ${item.key}`);
                }
                if (!this.library.base.consensus.verifyVote(votes.height, votes.id, item)) {
                    throw new Error('Failed to verify vote signature');
                }
            }
        });
        this.applyBlock = (block) => __awaiter(this, void 0, void 0, function* () {
            global.app.logger.trace('enter applyblock');
            const appliedTransactions = {};
            try {
                for (const transaction of block.transactions) {
                    if (appliedTransactions[transaction.id]) {
                        throw new Error(`Duplicate transaction in block: ${transaction.id}`);
                    }
                    yield this.modules.transactions.applyUnconfirmedTransactionAsync(transaction);
                    appliedTransactions[transaction.id] = transaction;
                }
            }
            catch (e) {
                global.app.logger.error(e);
                yield global.app.sdb.rollbackBlock();
                throw new Error(`Failed to apply block: ${e}`);
            }
        });
        this.processBlock = (b, options) => __awaiter(this, void 0, void 0, function* () {
            if (!this.loaded)
                throw new Error('Blockchain is loading');
            let block = b;
            global.app.sdb.beginBlock(block);
            if (!block.transactions)
                block.transactions = [];
            if (!options.local) {
                try {
                    block = this.library.base.block.objectNormalize(block);
                }
                catch (e) {
                    this.library.logger.error(`Failed to normalize block: ${e}`, block);
                    throw e;
                }
                yield this.verifyBlock(block, options);
                this.library.logger.debug('verify block ok');
                if (block.height !== 0) {
                    const exists = (undefined !== (yield global.app.sdb.getBlockById(block.id)));
                    if (exists)
                        throw new Error(`Block already exists: ${block.id}`);
                }
                if (block.height !== 0) {
                    try {
                        this.modules.delegates.validateBlockSlot(block);
                    }
                    catch (e) {
                        this.library.logger.error(e);
                        throw new Error(`Can't verify slot: ${e}`);
                    }
                    this.library.logger.debug('verify block slot ok');
                }
                for (const transaction of block.transactions) {
                    this.library.base.transaction.objectNormalize(transaction);
                }
                const idList = block.transactions.map(t => t.id);
                if (yield global.app.sdb.exists('Transaction', { id: { $in: idList } })) {
                    throw new Error('Block contain already confirmed transaction');
                }
                global.app.logger.trace('before applyBlock');
                try {
                    yield this.applyBlock(block, options);
                }
                catch (e) {
                    global.app.logger.error(`Failed to apply block: ${e}`);
                    throw e;
                }
            }
            try {
                this.saveBlockTransactions(block);
                yield this.applyRound(block);
                yield global.app.sdb.commitBlock();
                const trsCount = block.transactions.length;
                global.app.logger.info(`Block applied correctly with ${trsCount} transactions`);
                this.setLastBlock(block);
                if (options.broadcast) {
                    options.votes.signatures = options.votes.signatures.slice(0, 6);
                    this.library.bus.message('newBlock', block, options.votes);
                }
                this.library.bus.message('processBlock', block);
            }
            catch (e) {
                global.app.logger.error(block);
                global.app.logger.error('save block error: ', e);
                yield global.app.sdb.rollbackBlock();
                throw new Error(`Failed to save block: ${e}`);
            }
            finally {
                this.blockCache = {};
                this.proposeCache = {};
                this.lastVoteTime = null;
                this.privIsCollectingVotes = false;
                this.library.base.consensus.clearState();
            }
        });
        this.saveBlockTransactions = (block) => {
            global.app.logger.trace('Blocks#saveBlockTransactions height', block.height);
            for (const trs of block.transactions) {
                trs.height = block.height;
                global.app.sdb.create('Transaction', trs);
            }
            global.app.logger.trace('Blocks#save transactions');
        };
        this.increaseRoundData = (modifier, roundNumber) => {
            global.app.sdb.createOrLoad('Round', { fee: 0, reward: 0, round: roundNumber });
            return global.app.sdb.increase('Round', modifier, { round: roundNumber });
        };
        this.applyRound = (block) => __awaiter(this, void 0, void 0, function* () {
            if (block.height === 0) {
                this.modules.delegates.updateBookkeeper();
                return;
            }
            let address = addressHelper.generateAddress(block.delegate);
            global.app.sdb.increase('Delegate', { producedBlocks: 1 }, { address });
            let transFee = 0;
            for (const t of block.transactions) {
                if (transaction_mode_1.default.isDirectMode(t.mode) && t.fee >= 0) {
                    transFee += t.fee;
                }
            }
            const roundNumber = this.modules.round.calculateRound(block.height);
            const { fee, reward } = this.increaseRoundData({ fee: transFee, reward: block.reward }, roundNumber);
            if (block.height % 101 !== 0)
                return;
            global.app.logger.debug(`----------------------on round ${roundNumber} end-----------------------`);
            const delegates = this.modules.delegates.generateDelegateList(block.height);
            global.app.logger.debug('delegate length', delegates.length);
            const forgedBlocks = yield global.app.sdb.getBlocksByHeightRange(block.height - 100, block.height - 1);
            const forgedDelegates = [...forgedBlocks.map(b => b.delegate), block.delegate];
            const missedDelegates = forgedDelegates.filter(fd => !delegates.includes(fd));
            missedDelegates.forEach((md) => {
                address = addressHelper.generateAddress(md);
                global.app.sdb.increase('Delegate', { missedDelegate: 1 }, { address });
            });
            function updateDelegate(pk, fee, reward) {
                return __awaiter(this, void 0, void 0, function* () {
                    address = addressHelper.generateAddress(pk);
                    global.app.sdb.increase('Delegate', { fees: fee, rewards: reward }, { address });
                    global.app.sdb.increase('Account', { gny: fee + reward }, { address });
                });
            }
            const ratio = 1;
            const actualFees = Math.floor(fee * ratio);
            const feeAverage = Math.floor(actualFees / delegates.length);
            const feeRemainder = actualFees - (feeAverage * delegates.length);
            const actualRewards = Math.floor(reward * ratio);
            const rewardAverage = Math.floor(actualRewards / delegates.length);
            const rewardRemainder = actualRewards - (rewardAverage * delegates.length);
            for (const fd of forgedDelegates) {
                yield updateDelegate(fd, feeAverage, rewardAverage);
            }
            yield updateDelegate(block.delegate, feeRemainder, rewardRemainder);
            if (block.height % 101 === 0) {
                this.modules.delegates.updateBookkeeper();
            }
        });
        this.getBlocks = (minHeight, maxHeight, withTransaction) => __awaiter(this, void 0, void 0, function* () {
            const blocks = yield global.app.sdb.getBlocksByHeightRange(minHeight, maxHeight);
            if (!blocks || !blocks.length) {
                return [];
            }
            maxHeight = blocks[blocks.length - 1].height;
            if (withTransaction) {
                const transactions = yield global.app.sdb.findAll('Transaction', {
                    condition: {
                        height: { $gte: minHeight, $lte: maxHeight },
                    },
                });
                const firstHeight = blocks[0].height;
                for (const t of transactions) {
                    const h = t.height;
                    const b = blocks[h - firstHeight];
                    if (b) {
                        if (!b.transactions) {
                            b.transactions = [];
                        }
                        b.transactions.push(t);
                    }
                }
            }
            return blocks;
        });
        this.loadBlocksFromPeer = (peer, id, cb) => {
            let loaded = false;
            let count = 0;
            let lastValidBlock = null;
            let lastCommonBlockId = id;
            async.whilst(() => !loaded && count < 30, (next) => __awaiter(this, void 0, void 0, function* () {
                count++;
                const limit = 200;
                const params = {
                    limit,
                    lastBlockId: lastCommonBlockId,
                };
                let body;
                try {
                    body = this.modules.peer.request('blocks', params, peer);
                }
                catch (err) {
                    return next(`Failed to request remote peer: ${err}`);
                }
                if (!body) {
                    return next('Invalid response for blocks request');
                }
                const blocks = body.blocks;
                if (!Array.isArray(blocks) || blocks.length === 0) {
                    loaded = true;
                    return next();
                }
                const num = Array.isArray(blocks) ? blocks.length : 0;
                const address = `${peer.host}:${peer.port - 1}`;
                this.library.logger.info(`Loading ${num} blocks from ${address}`);
                try {
                    for (const block of blocks) {
                        yield this.processBlock(block, { syncing: true });
                        lastCommonBlockId = block.id;
                        lastValidBlock = block;
                        global.app.logger.info(`Block ${block.id} loaded from ${address} at`, block.height);
                    }
                    return next();
                }
                catch (e) {
                    global.app.logger.error('Failed to process synced block', e);
                    return cb(e);
                }
            }), (err) => {
                if (err) {
                    global.app.logger.error('load blocks from remote peer error:', err);
                }
                setImmediate(cb, err, lastValidBlock);
            });
        };
        this.generateBlock = (keypair, timestamp) => __awaiter(this, void 0, void 0, function* () {
            if (this.library.base.consensus.hasPendingBlock(timestamp)) {
                return;
            }
            const unconfirmedList = this.modules.transactions.getUnconfirmedTransactionList();
            const payloadHash = crypto.createHash('sha256');
            let payloadLength = 0;
            let fees = 0;
            for (const transaction of unconfirmedList) {
                fees += transaction.fee;
                const bytes = this.library.base.transaction.getBytes(transaction);
                if ((payloadLength + bytes.length) > 8 * 1024 * 1024) {
                    throw new Error('Playload length outof range');
                }
                payloadHash.update(bytes);
                payloadLength += bytes.length;
            }
            const height = this.lastBlock.height + 1;
            const block = {
                version: 0,
                delegate: keypair.publicKey.toString('hex'),
                height,
                prevBlockId: this.lastBlock.id,
                timestamp,
                transactions: unconfirmedList,
                count: unconfirmedList.length,
                fees,
                payloadHash: payloadHash.digest().toString('hex'),
                reward: this.blockreward.calculateReward(height),
            };
            block.signature = this.library.base.block.sign(block, keypair);
            block.id = this.library.base.block.getId(block);
            let activeKeypairs;
            try {
                activeKeypairs = yield this.modules.delegates.getActiveDelegateKeypairs(block.height);
            }
            catch (e) {
                throw new Error(`Failed to get active delegate keypairs: ${e}`);
            }
            const id = block.id;
            assert(activeKeypairs && activeKeypairs.length > 0, 'Active keypairs should not be empty');
            this.library.logger.info(`get active delegate keypairs len: ${activeKeypairs.length}`);
            const localVotes = this.library.base.consensus.createVotes(activeKeypairs, block);
            if (this.library.base.consensus.hasEnoughVotes(localVotes)) {
                this.modules.transactions.clearUnconfirmed();
                yield this.processBlock(block, { local: true, broadcast: true, votes: localVotes });
                this.library.logger.info(`Forged new block id: ${id}, height: ${height}, round: ${this.modules.round.calculateRound(height)}, slot: ${slots_1.default.getSlotNumber(block.timestamp)}, reward: ${block.reward}`);
                return;
            }
            if (!this.library.config.publicIp) {
                this.library.logger.error('No public ip');
                return;
            }
            const serverAddr = `${this.library.config.publicIp}:${this.library.config.peerPort}`;
            let propose;
            try {
                propose = this.library.base.consensus.createPropose(keypair, block, serverAddr);
            }
            catch (e) {
                this.library.logger.error('Failed to create propose', e);
                return;
            }
            this.library.base.consensus.setPendingBlock(block);
            this.library.base.consensus.addPendingVotes(localVotes);
            this.privIsCollectingVotes = true;
            this.library.bus.message('newPropose', propose, true);
            return;
        });
        this.onReceiveBlock = (block, votes) => {
            if (this.modules.loader.syncing() || !this.loaded) {
                return;
            }
            if (this.blockCache[block.id]) {
                return;
            }
            this.blockCache[block.id] = true;
            this.library.sequence.add((cb) => {
                if (block.prevBlockId === this.lastBlock.id && this.lastBlock.height + 1 === block.height) {
                    this.library.logger.info(`Received new block id: ${block.id}` +
                        ` height: ${block.height}` +
                        ` round: ${this.modules.round.calculateRound(this.modules.blocks.getLastBlock().height)}` +
                        ` slot: ${slots_1.default.getSlotNumber(block.timestamp)}`);
                    return (() => __awaiter(this, void 0, void 0, function* () {
                        const pendingTrsMap = new Map();
                        try {
                            const pendingTrs = this.modules.transactions.getUnconfirmedTransactionList();
                            for (const t of pendingTrs) {
                                pendingTrsMap.set(t.id, t);
                            }
                            this.modules.transactions.clearUnconfirmed();
                            yield global.app.sdb.rollbackBlock();
                            yield this.processBlock(block, { votes, broadcast: true });
                        }
                        catch (e) {
                            this.library.logger.error('Failed to process received block', e);
                        }
                        finally {
                            for (const t of block.transactions) {
                                pendingTrsMap.delete(t.id);
                            }
                            try {
                                const redoTransactions = [...pendingTrsMap.values()];
                                yield this.modules.transactions.processUnconfirmedTransactionsAsync(redoTransactions);
                            }
                            catch (e) {
                                this.library.logger.error('Failed to redo unconfirmed transactions', e);
                            }
                            cb();
                        }
                    }))();
                }
                if (block.prevBlockId !== this.lastBlock.id
                    && this.lastBlock.height + 1 === block.height) {
                    this.modules.delegates.fork(block, 1);
                    return cb('Fork');
                }
                if (block.prevBlockId === this.lastBlock.prevBlockId
                    && block.height === this.lastBlock.height
                    && block.id !== this.lastBlock.id) {
                    this.modules.delegates.fork(block, 5);
                    return cb('Fork');
                }
                if (block.height > this.lastBlock.height + 1) {
                    this.library.logger.info(`receive discontinuous block height ${block.height}`);
                    this.modules.loader.startSyncBlocks();
                    return cb();
                }
                return cb();
            });
        };
        this.onReceivePropose = (propose) => {
            if (this.modules.loader.syncing() || !this.loaded) {
                return;
            }
            if (this.proposeCache[propose.hash]) {
                return;
            }
            this.proposeCache[propose.hash] = true;
            this.library.sequence.add((cb) => {
                if (this.lastPropose && this.lastPropose.height === propose.height
                    && this.lastPropose.generatorPublicKey === propose.generatorPublicKey
                    && this.lastPropose.id !== propose.id) {
                    this.library.logger.warn(`generate different block with the same height, generator: ${propose.generatorPublicKey}`);
                    return setImmediate(cb);
                }
                if (propose.height !== this.lastBlock.height + 1) {
                    this.library.logger.debug(`invalid propose height, proposed height: "${propose.height}", lastBlock.height: "${this.lastBlock.height}"`, propose);
                    if (propose.height > this.lastBlock.height + 1) {
                        this.library.logger.info(`receive discontinuous propose height ${propose.height}`);
                        this.modules.loader.startSyncBlocks();
                    }
                    return setImmediate(cb);
                }
                if (this.lastVoteTime && Date.now() - this.lastVoteTime < 5 * 1000) {
                    this.library.logger.debug('ignore the frequently propose');
                    return setImmediate(cb);
                }
                this.library.logger.info(`receive propose height ${propose.height} bid ${propose.id}`);
                return async.waterfall([
                    (next) => {
                        try {
                            this.modules.delegates.validateProposeSlot(propose);
                            next();
                        }
                        catch (err) {
                            next(err.toString());
                        }
                    },
                    (next) => {
                        try {
                            let result = this.library.base.consensus.acceptPropose(propose);
                            next();
                        }
                        catch (err) {
                            next(err);
                        }
                    },
                    (next) => {
                        const activeKeypairs = this.modules.delegates.getActiveDelegateKeypairs(propose.height);
                        next(undefined, activeKeypairs);
                    },
                    (activeKeypairs, next) => __awaiter(this, void 0, void 0, function* () {
                        if (activeKeypairs && activeKeypairs.length > 0) {
                            const votes = this.library.base.consensus.createVotes(activeKeypairs, propose);
                            this.library.logger.debug(`send votes height ${votes.height} id ${votes.id} sigatures ${votes.signatures.length}`);
                            yield this.modules.transport.sendVotes(votes, propose.address);
                            this.lastVoteTime = Date.now();
                            this.lastPropose = propose;
                        }
                        setImmediate(next);
                    }),
                ], (err) => {
                    if (err) {
                        this.library.logger.error(`onReceivePropose error: ${err}`);
                    }
                    this.library.logger.debug('onReceivePropose finished');
                    cb();
                });
            });
        };
        this.onReceiveVotes = (votes) => {
            if (this.modules.loader.syncing() || !this.loaded) {
                return;
            }
            this.library.sequence.add((cb) => {
                const totalVotes = this.library.base.consensus.addPendingVotes(votes);
                if (totalVotes && totalVotes.signatures) {
                    this.library.logger.debug(`receive new votes, total votes number ${totalVotes.signatures.length}`);
                }
                if (this.library.base.consensus.hasEnoughVotes(totalVotes)) {
                    const block = this.library.base.consensus.getPendingBlock();
                    const height = block.height;
                    const id = block.id;
                    return (() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            this.modules.transactions.clearUnconfirmed();
                            yield this.processBlock(block, { votes: totalVotes, local: true, broadcast: true });
                            this.library.logger.info(`Forged new block id: ${id}, height: ${height}, round: ${this.modules.round.calculateRound(height)}, slot: ${slots_1.default.getSlotNumber(block.timestamp)}, reward: ${block.reward}`);
                        }
                        catch (err) {
                            this.library.logger.error(`Failed to process confirmed block height: ${height} id: ${id} error: ${err}`);
                        }
                        cb();
                    }))();
                }
                return setImmediate(cb);
            });
        };
        this.getSupply = () => {
            const height = this.lastBlock.height;
            return this.blockreward.calculateSupply(height);
        };
        this.getCirculatingSupply = () => {
            const height = this.lastBlock.height;
            return this.blockreward.calculateSupply(height);
        };
        this.isCollectingVotes = () => this.privIsCollectingVotes;
        this.isHealthy = () => {
            const lastBlock = this.lastBlock;
            const lastSlot = slots_1.default.getSlotNumber(lastBlock.timestamp);
            return slots_1.default.getNextSlot() - lastSlot < 3 && !this.modules.loader.syncing();
        };
        this.cleanup = (cb) => {
            this.library.logger.debug('Cleaning up core/blocks');
            this.loaded = false;
            cb();
        };
        this.onBind = (scope) => {
            this.modules = scope;
            this.loaded = true;
            return (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const count = global.app.sdb.blocksCount;
                    global.app.logger.info('Blocks found:', count);
                    if (!count) {
                        this.setLastBlock({ height: -1 });
                        yield this.processBlock(this.genesisBlock, {});
                    }
                    else {
                        const block = yield global.app.sdb.getBlockByHeight(count - 1);
                        this.setLastBlock(block);
                    }
                    this.library.bus.message('blockchainReady');
                }
                catch (e) {
                    global.app.logger.error('Failed to prepare local blockchain', e);
                    process.exit(0);
                }
            }))();
        };
        this.library = scope;
        this.genesisBlock = scope.genesisBlock;
    }
    getIdSequence2(height) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const maxHeight = Math.max(height, this.lastBlock.height);
                const minHeight = Math.max(0, maxHeight - 4);
                let blocks = yield global.app.sdb.getBlocksByHeightRange(minHeight, maxHeight);
                blocks = blocks.reverse();
                const ids = blocks.map((b) => b.id);
                return { ids, firstHeight: minHeight };
            }
            catch (e) {
                throw e;
            }
        });
    }
}
exports.default = Blocks;
//# sourceMappingURL=blocks.js.map