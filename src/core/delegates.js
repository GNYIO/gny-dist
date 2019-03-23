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
const crypto = require("crypto");
const ed = require("../utils/ed");
const slots_1 = require("../utils/slots");
const address_1 = require("../utils/address");
const block_reward_1 = require("../utils/block-reward");
class Delegates {
    constructor(scope) {
        this.loaded = false;
        this.keyPairs = {};
        this.isForgingEnabled = true;
        this.BOOK_KEEPER_NAME = 'round_bookkeeper';
        this.blockreward = new block_reward_1.default();
        this.isPublicKeyInKeyPairs = (publicKey) => {
            if (this.keyPairs[publicKey]) {
                return true;
            }
            else {
                return false;
            }
        };
        this.setKeyPair = (publicKey, keys) => {
            this.keyPairs[publicKey] = keys;
        };
        this.removeKeyPair = (publicKey) => {
            delete this.keyPairs[publicKey];
        };
        this.getBlockSlotData = (slot, height) => {
            const activeDelegates = this.generateDelegateList(height);
            if (!activeDelegates) {
                return;
            }
            const lastSlot = slots_1.default.getLastSlot(slot);
            for (let currentSlot = slot; currentSlot < lastSlot; currentSlot += 1) {
                const delegatePos = currentSlot % slots_1.default.delegates;
                const delegateKey = activeDelegates[delegatePos];
                if (delegateKey && this.keyPairs[delegateKey]) {
                    return {
                        time: slots_1.default.getSlotTime(currentSlot),
                        keypair: this.keyPairs[delegateKey],
                    };
                }
            }
        };
        this.loop = () => {
            if (!this.isForgingEnabled) {
                this.library.logger.trace('Loop:', 'forging disabled');
                return;
            }
            if (!Object.keys(this.keyPairs).length) {
                this.library.logger.trace('Loop:', 'no delegates');
                return;
            }
            if (!this.loaded || this.modules.loader.syncing()) {
                this.library.logger.trace('Loop:', 'node not ready');
                return;
            }
            const currentSlot = slots_1.default.getSlotNumber();
            const lastBlock = this.modules.blocks.getLastBlock();
            if (currentSlot === slots_1.default.getSlotNumber(lastBlock.timestamp)) {
                return;
            }
            if (Date.now() % 10000 > 5000) {
                this.library.logger.trace('Loop:', 'maybe too late to collect votes');
                return;
            }
            const currentBlockData = this.getBlockSlotData(currentSlot, lastBlock.height + 1);
            if (!currentBlockData) {
                this.library.logger.trace('Loop:', 'skipping slot');
                return;
            }
            (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (slots_1.default.getSlotNumber(currentBlockData.time) === slots_1.default.getSlotNumber()
                        && this.modules.blocks.getLastBlock().timestamp < currentBlockData.time) {
                        yield this.modules.blocks.generateBlock(currentBlockData.keypair, currentBlockData.time);
                    }
                }
                catch (e) {
                    this.library.logger.error('Failed generate block within slot:', e);
                    return;
                }
            }))();
        };
        this.loadMyDelegates = () => {
            let secrets = [];
            if (this.library.config.forging.secret) {
                secrets = Array.isArray(this.library.config.forging.secret)
                    ? this.library.config.forging.secret : [this.library.config.forging.secret];
            }
            try {
                const delegates = global.app.sdb.getAll('Delegate');
                if (!delegates || !delegates.length) {
                    return 'Delegates not found in database';
                }
                const delegateMap = new Map();
                for (const d of delegates) {
                    delegateMap.set(d.publicKey, d);
                }
                for (const secret of secrets) {
                    const keypair = ed.generateKeyPair(crypto.createHash('sha256').update(secret, 'utf8').digest());
                    const publicKey = keypair.publicKey.toString('hex');
                    if (delegateMap.has(publicKey)) {
                        this.keyPairs[publicKey] = keypair;
                        this.library.logger.info(`Forging enabled on account: ${delegateMap.get(publicKey).address}`);
                    }
                    else {
                        this.library.logger.info(`Delegate with this public key not found: ${keypair.publicKey.toString('hex')}`);
                    }
                }
            }
            catch (e) {
                return e;
            }
        };
        this.getActiveDelegateKeypairs = (height) => {
            const delegates = this.generateDelegateList(height);
            if (!delegates) {
                return;
            }
            const results = [];
            for (const key in this.keyPairs) {
                if (delegates.indexOf(key) !== -1) {
                    results.push(this.keyPairs[key]);
                }
            }
            return results;
        };
        this.validateProposeSlot = (propose) => {
            const activeDelegates = this.generateDelegateList(propose.height);
            const currentSlot = slots_1.default.getSlotNumber(propose.timestamp);
            const delegateKey = activeDelegates[currentSlot % slots_1.default.delegates];
            if (delegateKey && propose.generatorPublicKey === delegateKey) {
                return;
            }
            throw new Error('Failed to validate propose slot');
        };
        this.generateDelegateList = (height) => {
            try {
                const truncDelegateList = this.getBookkeeper();
                const seedSource = this.modules.round.calculateRound(height).toString();
                let currentSeed = crypto.createHash('sha256').update(seedSource, 'utf8').digest();
                for (let i = 0, delCount = truncDelegateList.length; i < delCount; i++) {
                    for (let x = 0; x < 4 && i < delCount; i++, x++) {
                        const newIndex = currentSeed[x] % delCount;
                        const b = truncDelegateList[newIndex];
                        truncDelegateList[newIndex] = truncDelegateList[i];
                        truncDelegateList[i] = b;
                    }
                    currentSeed = crypto.createHash('sha256').update(currentSeed).digest();
                }
                return truncDelegateList;
            }
            catch (e) {
                global.app.logger.error('error while generating DelgateList', e);
                return;
            }
        };
        this.fork = (block, cause) => {
            this.library.logger.info('Fork', {
                delegate: block.delegate,
                block: {
                    id: block.id,
                    timestamp: block.timestamp,
                    height: block.height,
                    prevBlockId: block.prevBlockId,
                },
                cause,
            });
        };
        this.validateBlockSlot = (block) => {
            const activeDelegates = this.generateDelegateList(block.height);
            const currentSlot = slots_1.default.getSlotNumber(block.timestamp);
            const delegateKey = activeDelegates[currentSlot % 101];
            if (delegateKey && block.delegate === delegateKey) {
                return;
            }
            throw new Error(`Failed to verify slot, expected delegate: ${delegateKey}`);
        };
        this.getDelegates = () => {
            let delegates = global.app.sdb.getAll('Delegate').map(d => Object.assign({}, d));
            if (!delegates || !delegates.length) {
                global.app.logger.info('no delgates');
                return undefined;
            }
            delegates = delegates.sort(this.compare);
            const lastBlock = this.modules.blocks.getLastBlock();
            const totalSupply = this.blockreward.calculateSupply(lastBlock.height);
            for (let i = 0; i < delegates.length; ++i) {
                const d = delegates[i];
                d.rate = i + 1;
                delegates[i].approval = ((d.votes / totalSupply) * 100);
                let percent = 100 - (d.missedBlocks / (d.producedBlocks + d.missedBlocks) / 100);
                percent = percent || 0;
                delegates[i].productivity = parseFloat(Math.floor(percent * 100) / 100).toFixed(2);
                delegates[i].vote = delegates[i].votes;
                delegates[i].missedblocks = delegates[i].missedBlocks;
                delegates[i].producedblocks = delegates[i].producedBlocks;
                global.app.sdb.update('Delegate', delegates[i], { address: delegates[i].address });
            }
            return delegates;
        };
        this.enableForging = () => {
            this.isForgingEnabled = true;
        };
        this.disableForging = () => {
            this.isForgingEnabled = false;
        };
        this.onBind = (scope) => {
            this.modules = scope;
        };
        this.onBlockchainReady = () => {
            this.loaded = true;
            const error = this.loadMyDelegates();
            if (error) {
                this.library.logger.error('Failed to load delegates', error);
            }
            const nextLoop = () => {
                const result = this.loop();
                setTimeout(nextLoop, 100);
            };
            setImmediate(nextLoop);
        };
        this.compare = (l, r) => {
            if (l.votes !== r.votes) {
                return r.votes - l.votes;
            }
            return l.publicKey < r.publicKey ? 1 : -1;
        };
        this.cleanup = (cb) => {
            this.library.logger.debug('Cleaning up core/delegates');
            this.loaded = false;
            cb();
        };
        this.getTopDelegates = () => {
            const allDelegates = global.app.sdb.getAll('Delegate');
            return allDelegates.sort(this.compare).map(d => d.publicKey).slice(0, 101);
        };
        this.getBookkeeperAddresses = () => {
            const bookkeeper = this.getBookkeeper();
            const addresses = new Set();
            for (const i of bookkeeper) {
                const address = address_1.default.generateAddress(i);
                addresses.add(address);
            }
            return addresses;
        };
        this.getBookkeeper = () => {
            const item = global.app.sdb.get('Variable', this.BOOK_KEEPER_NAME);
            if (!item)
                throw new Error('Bookkeeper variable not found');
            return JSON.parse(item.value);
        };
        this.updateBookkeeper = (delegates) => {
            const value = JSON.stringify(delegates || this.getTopDelegates());
            const { create } = global.app.sdb.createOrLoad('Variable', { key: this.BOOK_KEEPER_NAME, value });
            if (!create) {
                global.app.sdb.update('Variable', { value }, { key: this.BOOK_KEEPER_NAME });
            }
        };
        this.library = scope;
    }
}
exports.default = Delegates;
//# sourceMappingURL=delegates.js.map