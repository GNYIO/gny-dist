"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxAmount = 100000000;
exports.maxPayloadLength = 8 * 1024 * 1024;
exports.blockHeaderLength = 248;
exports.addressLength = 208;
exports.maxAddressesLength = 208 * 128;
exports.maxClientConnections = 100;
exports.numberLength = 100000000;
exports.feeStartVolume = 10000 * 100000000;
exports.feeStart = 1;
exports.maxRequests = 10000 * 12;
exports.requestLength = 104;
exports.signatureLength = 196;
exports.maxSignaturesLength = 196 * 256;
exports.maxConfirmations = 77 * 100;
exports.confirmationLength = 77;
exports.fixedPoint = 10 ** 6;
exports.totalAmount = 2500000000000000;
exports.maxTxsPerBlock = 20000;
exports.interval = 15;
exports.INTERVAL = 10;
exports.DELEGATES = 101;
exports.EPOCH_TIME = new Date(Date.UTC(2018, 10, 18, 20, 0, 0, 0));
exports.REWARDS = {
    MILESTONES: [
        200000000,
        150000000,
        100000000,
        50000000,
    ],
    OFFSET: 2160,
    DISTANCE: 3000000,
};
exports.TOTAL_AMOUNT = '10000000000000000';
//# sourceMappingURL=constants.js.map