"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const ByteBuffer = require("bytebuffer");
const ed = require("../utils/ed");
const assert = require("assert");
const slots_1 = require("../utils/slots");
const ip = require("ip");
const constants_1 = require("../utils/constants");
class Consensus {
    constructor(scope) {
        this.pendingBlock = null;
        this.pendingVotes = null;
        this.votesKeySet = new Set();
        this.normalizeVotes = (votes) => {
            const report = this.scope.scheme.validate(votes, {
                type: 'object',
                properties: {
                    height: {
                        type: 'integer',
                    },
                    id: {
                        type: 'string',
                    },
                    signatures: {
                        type: 'array',
                        minLength: 1,
                        maxLength: constants_1.DELEGATES,
                    },
                },
                required: ['height', 'id', 'signatures'],
            });
            if (!report) {
                throw Error(this.scope.scheme.getLastError().toString());
            }
            return votes;
        };
        this.createVotes = (keypairs, block) => {
            const hash = this.calculateVoteHash(block.height, block.id);
            const votes = {
                height: block.height,
                id: block.id,
                signatures: [],
            };
            keypairs.forEach((kp) => {
                const privateKeyBuffer = Buffer.from(kp.privateKey);
                votes.signatures.push({
                    publicKey: kp.publicKey.toString('hex'),
                    signature: ed.sign(hash, privateKeyBuffer).toString('hex'),
                });
            });
            return votes;
        };
        this.verifyVote = (height, id, vote) => {
            try {
                const hash = this.calculateVoteHash(height, id);
                const signature = Buffer.from(vote.signature, 'hex');
                const publicKey = Buffer.from(vote.publicKey, 'hex');
                return ed.verify(hash, signature, publicKey);
            }
            catch (e) {
                return false;
            }
        };
        this.addPendingVotes = (votes) => {
            if (!this.pendingBlock || this.pendingBlock.height !== votes.height
                || this.pendingBlock.id !== votes.id) {
                return this.pendingVotes;
            }
            for (let i = 0; i < votes.signatures.length; ++i) {
                const item = votes.signatures[i];
                if (this.votesKeySet[item.publicKey]) {
                    continue;
                }
                if (this.verifyVote(votes.height, votes.id, item)) {
                    this.votesKeySet[item.publicKey] = true;
                    if (!this.pendingVotes) {
                        this.pendingVotes = {
                            height: votes.height,
                            id: votes.id,
                            signatures: [],
                        };
                    }
                    this.pendingVotes.signatures.push(item);
                }
            }
            return this.pendingVotes;
        };
        this.hasEnoughVotesRemote = (votes) => votes && votes.signatures
            && votes.signatures.length >= 6;
        this.scope = scope;
    }
    calculateVoteHash(height, id) {
        const byteBuffer = new ByteBuffer();
        byteBuffer.writeLong(height);
        byteBuffer.writeString(id);
        byteBuffer.flip();
        const buffer = byteBuffer.toBuffer();
        return crypto.createHash('sha256').update(buffer).digest();
    }
    hasEnoughVotes(votes) {
        return votes && votes.signatures && (votes.signatures.length > constants_1.DELEGATES * 2 / 3);
    }
    setPendingBlock(block) {
        this.pendingBlock = block;
    }
    hasPendingBlock(timestamp) {
        if (!this.pendingBlock) {
            return false;
        }
        return slots_1.default.getSlotNumber(this.pendingBlock.timestamp) === slots_1.default.getSlotNumber(timestamp);
    }
    getPendingBlock() {
        return this.pendingBlock;
    }
    calculateProposeHash(propose) {
        const byteBuffer = new ByteBuffer();
        byteBuffer.writeLong(propose.height);
        byteBuffer.writeString(propose.id);
        const generatorPublicKeyBuffer = Buffer.from(propose.generatorPublicKey, 'hex');
        for (let i = 0; i < generatorPublicKeyBuffer.length; i++) {
            byteBuffer.writeByte(generatorPublicKeyBuffer[i]);
        }
        byteBuffer.writeInt(propose.timestamp);
        const parts = propose.address.split(':');
        assert(parts.length === 2);
        byteBuffer.writeInt(ip.toLong(parts[0]));
        byteBuffer.writeInt(Number(parts[1]));
        byteBuffer.flip();
        const buffer = byteBuffer.toBuffer();
        return crypto.createHash('sha256').update(buffer).digest();
    }
    createPropose(keypair, block, address) {
        assert(keypair.publicKey.toString('hex') === block.delegate);
        const propose = {
            height: block.height,
            id: block.id,
            timestamp: block.timestamp,
            generatorPublicKey: block.delegate,
            address,
        };
        const hash = this.getProposeHash(propose);
        propose.hash = hash.toString('hex');
        const privateKeyBuffer = Buffer.from(keypair.privateKey);
        propose.signature = ed.sign(hash, privateKeyBuffer).toString('hex');
        return propose;
    }
    getProposeHash(propose) {
        const byteBuffer = new ByteBuffer();
        byteBuffer.writeLong(propose.height);
        byteBuffer.writeString(propose.id);
        const generatorPublicKeyBuffer = Buffer.from(propose.generatorPublicKey, 'hex');
        for (let i = 0; i < generatorPublicKeyBuffer.length; i++) {
            byteBuffer.writeByte(generatorPublicKeyBuffer[i]);
        }
        byteBuffer.writeInt(propose.timestamp);
        const parts = propose.address.split(':');
        assert(parts.length === 2);
        byteBuffer.writeInt(ip.toLong(parts[0]));
        byteBuffer.writeInt(Number(parts[1]));
        byteBuffer.flip();
        const buffer = byteBuffer.toBuffer();
        return crypto.createHash('sha256').update(buffer).digest();
    }
    acceptPropose(propose) {
        const hash = this.calculateProposeHash(propose);
        if (propose.hash !== hash.toString('hex')) {
            throw Error('Propose hash is not correct.');
        }
        try {
            const signature = Buffer.from(propose.signature, 'hex');
            const publicKey = Buffer.from(propose.generatorPublicKey, 'hex');
            if (ed.verify(hash, signature, publicKey)) {
                return 'Verify propose successful.';
            }
            throw Error('Propose signature verify failed.');
        }
        catch (e) {
            throw Error(`Propose signature exception: ${e.toString()}`);
        }
    }
    clearState() {
        this.pendingVotes = undefined;
        this.votesKeySet = new Set();
        this.pendingBlock = undefined;
    }
}
exports.Consensus = Consensus;
//# sourceMappingURL=consensus.js.map