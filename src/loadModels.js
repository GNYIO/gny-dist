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
const _ = require("lodash");
const asch_smartdb_1 = require("asch-smartdb");
const account_1 = require("./model/account");
const asset_1 = require("./model/asset");
const balance_1 = require("./model/balance");
const delegate_1 = require("./model/delegate");
const issuer_1 = require("./model/issuer");
const round_1 = require("./model/round");
const transaction_1 = require("./model/transaction");
const transfer_1 = require("./model/transfer");
const variable_1 = require("./model/variable");
const vote_1 = require("./model/vote");
function formatName(name) {
    return _.chain(name).camelCase().upperFirst().value();
}
function createModelSchema(model) {
    const formattedName = formatName(model.name);
    return new asch_smartdb_1.AschCore.ModelSchema(model.class, formattedName);
}
function loadModels() {
    return __awaiter(this, void 0, void 0, function* () {
        const schemas = [];
        schemas.push(createModelSchema({ class: account_1.default, name: 'account' }));
        schemas.push(createModelSchema({ class: asset_1.default, name: 'asset' }));
        schemas.push(createModelSchema({ class: balance_1.default, name: 'balance' }));
        schemas.push(createModelSchema({ class: delegate_1.default, name: 'delegate' }));
        schemas.push(createModelSchema({ class: issuer_1.default, name: 'issuer' }));
        schemas.push(createModelSchema({ class: round_1.default, name: 'round' }));
        schemas.push(createModelSchema({ class: transaction_1.default, name: 'transaction' }));
        schemas.push(createModelSchema({ class: transfer_1.default, name: 'transfer' }));
        schemas.push(createModelSchema({ class: variable_1.default, name: 'variable' }));
        schemas.push(createModelSchema({ class: vote_1.default, name: 'vote' }));
        yield global.app.sdb.init(schemas);
    });
}
exports.default = loadModels;
//# sourceMappingURL=loadModels.js.map