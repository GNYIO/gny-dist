"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sodium_1 = require("sodium");
function generateKeyPair(hash) {
    const keypair = sodium_1.api.crypto_sign_seed_keypair(hash);
    return {
        publicKey: keypair.publicKey,
        privateKey: keypair.secretKey,
    };
}
exports.generateKeyPair = generateKeyPair;
function sign(hash, privateKey) {
    return sodium_1.api.crypto_sign_detached(hash, privateKey);
}
exports.sign = sign;
function verify(hash, signature, publicKey) {
    return sodium_1.api.crypto_sign_verify_detached(signature, hash, publicKey);
}
exports.verify = verify;
//# sourceMappingURL=ed.js.map