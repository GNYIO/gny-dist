"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const _ = require("lodash");
const protocolBuffers = require('protocol-buffers');
class Protobuf {
    constructor(schema) {
        this.schema = schema;
    }
    encodeBlock(block) {
        const obj = _.cloneDeep(block);
        obj.payloadHash = Buffer.from(obj.payloadHash, 'hex');
        obj.generatorPublicKey = Buffer.from(obj.generatorPublicKey, 'hex');
        if (obj.blockSignature) {
            obj.blockSignature = Buffer.from(obj.blockSignature, 'hex');
        }
        return this.schema.Block.encode(obj);
    }
    decodeBlock(data) {
        const obj = this.schema.Block.decode(data);
        obj.payloadHash = obj.payloadHash.toString('hex');
        obj.generatorPublicKey = obj.generatorPublicKey.toString('hex');
        if (obj.blockSignature) {
            obj.blockSignature = obj.blockSignature.toString('hex');
        }
        return obj;
    }
    encodeBlockPropose(propose) {
        const obj = _.cloneDeep(propose);
        obj.generatorPublicKey = Buffer.from(obj.generatorPublicKey, 'hex');
        obj.hash = Buffer.from(obj.hash, 'hex');
        obj.signature = Buffer.from(obj.signature, 'hex');
        return this.schema.BlockPropose.encode(obj);
    }
    decodeBlockPropose(data) {
        const obj = this.schema.BlockPropose.decode(data);
        obj.generatorPublicKey = obj.generatorPublicKey.toString('hex');
        obj.hash = obj.hash.toString('hex');
        obj.signature = obj.signature.toString('hex');
        return obj;
    }
    encodeBlockVotes(obj) {
        for (let i = 0; i < obj.signatures.length; ++i) {
            const signature = obj.signatures[i];
            signature.key = Buffer.from(signature.publicKey, 'hex');
            signature.sig = Buffer.from(signature.signature, 'hex');
        }
        return this.schema.BlockVotes.encode(obj);
    }
    decodeBlockVotes(data) {
        const obj = this.schema.BlockVotes.decode(data);
        for (let i = 0; i < obj.signatures.length; ++i) {
            const signature = obj.signatures[i];
            signature.key = signature.key.toString('hex');
            signature.sig = signature.sig.toString('hex');
        }
        return obj;
    }
    encodeTransaction(trs) {
        const obj = _.cloneDeep(trs);
        return this.schema.Transaction.encode(obj);
    }
    decodeTransaction(data) {
        const obj = this.schema.Transaction.decode(data);
        return obj;
    }
}
exports.Protobuf = Protobuf;
exports.default = {
    getSchema: (schemaFile) => {
        const data = fs.readFileSync(schemaFile);
        const schema = protocolBuffers(data);
        return new Protobuf(schema);
    }
};
//# sourceMappingURL=protobuf.js.map