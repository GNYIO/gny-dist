"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./core/server");
const accounts_1 = require("./core/accounts");
const transactions_1 = require("./core/transactions");
const loader_1 = require("./core/loader");
const system_1 = require("./core/system");
const peer_1 = require("./core/peer");
const transport_1 = require("./core/transport");
const delegates_1 = require("./core/delegates");
const round_1 = require("./core/round");
const uia_1 = require("./core/uia");
const blocks_1 = require("./core/blocks");
function loadModules(scope) {
    const server = new server_1.default(scope);
    const accounts = new accounts_1.default(scope);
    const transactions = new transactions_1.default(scope);
    const loader = new loader_1.default(scope);
    const system = new system_1.default(scope);
    const peer = new peer_1.default(scope);
    const transport = new transport_1.default(scope);
    const delegates = new delegates_1.default(scope);
    const round = new round_1.default(scope);
    const uia = new uia_1.default(scope);
    const blocks = new blocks_1.default(scope);
    const modules = {
        server: server,
        accounts: accounts,
        transactions: transactions,
        loader: loader,
        system: system,
        peer: peer,
        transport: transport,
        delegates: delegates,
        round: round,
        uia: uia,
        blocks: blocks
    };
    return modules;
}
exports.default = loadModules;
//# sourceMappingURL=loadModules.js.map