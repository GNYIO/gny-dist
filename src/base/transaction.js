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
const ByteBuffer = require("bytebuffer");
const ed = require("../utils/ed");
const slots_1 = require("../utils/slots");
const constants = require("../utils/constants");
const transaction_mode_1 = require("../utils/transaction-mode");
const addressHelper = require("../utils/address");
const calculate_fee_1 = require("../utils/calculate-fee");
class Transaction {
    constructor(scope) {
        this.create = (data) => {
            const transaction = {
                secret: data.secret,
                type: data.type,
                senderId: addressHelper.generateAddress(data.keypair.publicKey.toString('hex')),
                senderPublicKey: data.keypair.publicKey.toString('hex'),
                timestamp: slots_1.default.getTime(undefined),
                message: data.message,
                args: data.args,
                fee: data.fee,
                mode: data.mode,
            };
            transaction.signatures = [this.sign(data.keypair, transaction)];
            if (data.secondKeypair) {
                transaction.secondSignature = this.sign(data.secondKeypair, transaction);
            }
            transaction.id = this.getHash(transaction).toString('hex');
            return transaction;
        };
        this.sign = (keypair, transaction) => {
            const bytes = this.getBytes(transaction, true, true);
            const hash = crypto.createHash('sha256').update(bytes).digest();
            const privateKeyBuffer = Buffer.from(keypair.privateKey);
            return ed.sign(hash, privateKeyBuffer).toString('hex');
        };
        this.objectNormalize = (transaction) => {
            for (const i in transaction) {
                if (transaction[i] === null || typeof transaction[i] === 'undefined') {
                    delete transaction[i];
                }
                if (Buffer.isBuffer(transaction[i])) {
                    transaction[i] = transaction[i].toString();
                }
            }
            if (transaction.args && typeof transaction.args === 'string') {
                try {
                    transaction.args = JSON.parse(transaction.args);
                    if (!Array.isArray(transaction.args))
                        throw new Error('Transaction args must be json array');
                }
                catch (e) {
                    throw new Error(`Failed to parse args: ${e}`);
                }
            }
            if (transaction.signatures && typeof transaction.signatures === 'string') {
                try {
                    transaction.signatures = JSON.parse(transaction.signatures);
                }
                catch (e) {
                    throw new Error(`Failed to parse signatures: ${e}`);
                }
            }
            const report = this.library.scheme.validate(transaction, {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    height: { type: 'integer' },
                    type: { type: 'integer' },
                    timestamp: { type: 'integer' },
                    senderId: { type: 'string' },
                    fee: { type: 'integer', minimum: 0, maximum: constants.totalAmount },
                    secondSignature: { type: 'string', format: 'signature' },
                    signatures: { type: 'array' },
                    message: { type: 'string', maxLength: 256 },
                },
                required: ['type', 'timestamp', 'senderId', 'signatures'],
            });
            if (!report) {
                this.library.logger.error(`Failed to normalize transaction body: ${this.library.scheme.getLastError().details[0].message}`, transaction);
                throw Error(this.library.scheme.getLastError().toString());
            }
            return transaction;
        };
        this.library = scope;
    }
    getId(transaction) {
        return this.getHash(transaction).toString('hex');
    }
    getHash(transaction) {
        return crypto.createHash('sha256').update(this.getBytes(transaction)).digest();
    }
    getBytes(transaction, skipSignature, skipSecondSignature) {
        const byteBuffer = new ByteBuffer(1, true);
        byteBuffer.writeInt(transaction.type);
        byteBuffer.writeInt(transaction.timestamp);
        byteBuffer.writeLong(transaction.fee);
        byteBuffer.writeString(transaction.senderId);
        if (transaction.requestorId) {
            byteBuffer.writeString(transaction.requestorId);
        }
        if (transaction.mode) {
            byteBuffer.writeInt(transaction.mode);
        }
        if (transaction.message)
            byteBuffer.writeString(transaction.message);
        if (transaction.args) {
            let args;
            if (typeof transaction.args === 'string') {
                args = transaction.args;
            }
            else if (Array.isArray(transaction.args)) {
                args = JSON.stringify(transaction.args);
            }
            else {
                throw new Error('Invalid transaction args');
            }
            byteBuffer.writeString(args);
        }
        if (!skipSignature && transaction.signatures) {
            for (const signature of transaction.signatures) {
                const signatureBuffer = Buffer.from(signature, 'hex');
                for (let i = 0; i < signatureBuffer.length; i++) {
                    byteBuffer.writeByte(signatureBuffer[i]);
                }
            }
        }
        if (!skipSecondSignature && transaction.secondSignature) {
            const secondSignatureBuffer = Buffer.from(transaction.secondSignature, 'hex');
            for (let i = 0; i < secondSignatureBuffer.length; i++) {
                byteBuffer.writeByte(secondSignatureBuffer[i]);
            }
        }
        byteBuffer.flip();
        return byteBuffer.toBuffer();
    }
    verifyNormalSignature(transaction, requestor, bytes) {
        if (!this.verifyBytes(bytes, transaction.senderPublicKey, transaction.signatures[0])) {
            return 'Invalid signature';
        }
        if (requestor.secondPublicKey) {
            if (!transaction.secondSignature)
                return 'Second signature not provided';
            if (!this.verifyBytes(bytes, requestor.secondPublicKey, transaction.secondSignature)) {
                return 'Invalid second signature';
            }
        }
        return undefined;
    }
    verify(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { trs, sender, requestor } = context;
            if (slots_1.default.getSlotNumber(trs.timestamp) > slots_1.default.getSlotNumber()) {
                return 'Invalid transaction timestamp';
            }
            if (trs.type === undefined || trs.type === null) {
                return 'Invalid function';
            }
            const feeCalculator = calculate_fee_1.default[trs.type];
            if (!feeCalculator)
                return 'Fee calculator not found';
            const minFee = 100000000 * feeCalculator(trs);
            if (trs.fee < minFee)
                return 'Fee not enough';
            try {
                const bytes = this.getBytes(trs, true, true);
                if (trs.senderPublicKey) {
                    const error = this.verifyNormalSignature(trs, requestor, bytes);
                    if (error)
                        return error;
                }
                else {
                    return 'Failed to verify signature';
                }
            }
            catch (e) {
                this.library.logger.error('verify signature excpetion', e);
                return 'Failed to verify signature';
            }
            return undefined;
        });
    }
    verifyBytes(bytes, publicKey, signature) {
        try {
            const data2 = Buffer.alloc(bytes.length);
            for (let i = 0; i < data2.length; i++) {
                data2[i] = bytes[i];
            }
            const hash = crypto.createHash('sha256').update(data2).digest();
            const signatureBuffer = Buffer.from(signature, 'hex');
            const publicKeyBuffer = Buffer.from(publicKey, 'hex');
            return ed.verify(hash, signatureBuffer || ' ', publicKeyBuffer || ' ');
        }
        catch (e) {
            throw Error(e.toString());
        }
    }
    apply(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { block, trs, sender, requestor, } = context;
            const name = global.app.getContractName(trs.type);
            if (!name) {
                throw new Error(`Unsupported transaction type: ${trs.type}`);
            }
            const [mod, func] = name.split('.');
            if (!mod || !func) {
                throw new Error('Invalid transaction function');
            }
            const fn = global.app.contract[mod][func];
            if (!fn) {
                throw new Error('Contract not found');
            }
            if (block.height !== 0) {
                if (transaction_mode_1.default.isRequestMode(trs.mode) && !context.activating) {
                    const requestorFee = 20000000;
                    if (requestor.gny < requestorFee)
                        throw new Error('Insufficient requestor balance');
                    requestor.gny -= requestorFee;
                    global.app.addRoundFee(String(requestorFee), this.library.modules.round.calculateRound(block.height));
                    global.app.sdb.create('TransactionStatu', { tid: trs.id, executed: 0 });
                    global.app.sdb.update('Account', { gny: requestor.gny }, { address: requestor.address });
                    return;
                }
                if (sender.gny < trs.fee)
                    throw new Error('Insufficient sender balance');
                sender.gny -= trs.fee;
                global.app.sdb.update('Account', { gny: sender.gny }, { address: sender.address });
            }
            const error = yield fn.apply(context, trs.args);
            if (error) {
                throw new Error(error);
            }
        });
    }
}
exports.Transaction = Transaction;
//# sourceMappingURL=transaction.js.map