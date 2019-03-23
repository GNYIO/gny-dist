"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const blocksApi_1 = require("../packages/api/blocksApi");
const accountsApi_1 = require("../packages/api/accountsApi");
const delegatesApi_1 = require("../packages/api/delegatesApi");
const peerApi_1 = require("../packages/api/peerApi");
const transactionsApi_1 = require("../packages/api/transactionsApi");
const transportApi_1 = require("../packages/api/transportApi");
const uiaApi_1 = require("../packages/api/uiaApi");
const loaderApi_1 = require("../packages/api/loaderApi");
const balancesApi_1 = require("../packages/api/balancesApi");
const transfersApi_1 = require("../packages/api/transfersApi");
function loadCoreApi(modules, scope) {
    const blocksApi = new blocksApi_1.default(modules, scope);
    const accountsApi = new accountsApi_1.default(modules, scope);
    const delgatesApi = new delegatesApi_1.default(modules, scope);
    const peerApi = new peerApi_1.default(modules, scope);
    const transactionsApi = new transactionsApi_1.default(modules, scope);
    const transportApi = new transportApi_1.default(modules, scope);
    const uiaApi = new uiaApi_1.default(modules, scope);
    const transfersApi = new transfersApi_1.default(scope);
    const loaderApi = new loaderApi_1.default(modules, scope);
    const balancesApi = new balancesApi_1.default(scope);
    return {
        blocksApi,
        accountsApi,
        delgatesApi,
        peerApi,
        transactionsApi,
        transportApi,
        uiaApi,
        transfersApi,
        balancesApi,
        loaderApi,
    };
}
exports.default = loadCoreApi;
//# sourceMappingURL=loadCoreApi.js.map