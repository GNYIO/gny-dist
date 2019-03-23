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
const path = require("path");
const events_1 = require("events");
const validate = require("validate.js");
const asch_smartdb_1 = require("asch-smartdb");
const slots_1 = require("./utils/slots");
const balance_manager_1 = require("./smartdb/balance-manager");
const auto_increment_1 = require("./smartdb/auto-increment");
const transaction_mode_1 = require("./utils/transaction-mode");
const loadModels_1 = require("./loadModels");
const loadContracts_1 = require("./loadContracts");
const loadInterfaces_1 = require("./loadInterfaces");
const address_1 = require("./utils/address");
const bignumber = require("bignumber");
function adaptSmartDBLogger(config) {
    const { LogLevel } = asch_smartdb_1.AschCore;
    const levelMap = {
        trace: LogLevel.Trace,
        debug: LogLevel.Debug,
        log: LogLevel.Log,
        info: LogLevel.Info,
        warn: LogLevel.Warn,
        error: LogLevel.Error,
        fatal: LogLevel.Fatal,
    };
    asch_smartdb_1.AschCore.LogManager.logFactory = {
        createLog: () => global.app.logger,
        format: false,
        getLevel: () => {
            const appLogLevel = String(config.logLevel).toLocaleLowerCase();
            return levelMap[appLogLevel] || LogLevel.Info;
        },
    };
}
function runtime(options) {
    return __awaiter(this, void 0, void 0, function* () {
        global.app = {
            sdb: null,
            balances: null,
            contract: {},
            contractTypeMapping: {},
            feeMapping: {},
            defaultFee: {
                currency: 'GNY',
                min: '10000000',
            },
            hooks: {},
            logger: options.logger,
        };
        global.app.validators = {
            amount: (amount) => {
                if (typeof amount !== 'string')
                    return 'Invalid amount type';
                if (!/^[1-9][0-9]*$/.test(amount))
                    return 'Amount should be integer';
                let bnAmount;
                try {
                    bnAmount = global.app.util.bignumber(amount);
                }
                catch (e) {
                    return 'Failed to convert';
                }
                if (bnAmount.lt(1) || bnAmount.gt('1e48'))
                    return 'Invalid amount range';
                return null;
            },
            name: (value) => {
                const regname = /^[a-z0-9_]{2,20}$/;
                if (!regname.test(value))
                    return 'Invalid name';
                return null;
            },
            publickey: (value) => {
                const reghex = /^[0-9a-fA-F]{64}$/;
                if (!reghex.test(value))
                    return 'Invalid public key';
                return null;
            },
            string: (value, constraints) => {
                if (constraints.length) {
                    return JSON.stringify(validate({ data: value }, { data: { length: constraints.length } }));
                }
                if (constraints.isEmail) {
                    return JSON.stringify(validate({ email: value }, { email: { email: true } }));
                }
                if (constraints.url) {
                    return JSON.stringify(validate({ url: value }, { url: { url: constraints.url } }));
                }
                if (constraints.number) {
                    return JSON.stringify(validate({ number: value }, { number: { numericality: constraints.number } }));
                }
                return null;
            },
        };
        global.app.validate = (type, value, constraints) => {
            if (!global.app.validators[type])
                throw new Error(`Validator not found: ${type}`);
            const error = global.app.validators[type](value, constraints);
            if (error)
                throw new Error(error);
        };
        global.app.registerContract = (type, name) => {
            global.app.contractTypeMapping[type] = name;
        };
        global.app.getContractName = type => global.app.contractTypeMapping[type];
        global.app.registerFee = (type, min, currency) => {
            global.app.feeMapping[type] = {
                currency: currency || global.app.defaultFee.currency,
                min,
            };
        };
        global.app.getFee = type => global.app.feeMapping[type];
        global.app.setDefaultFee = (min, currency) => {
            global.app.defaultFee.currency = currency;
            global.app.defaultFee.min = min;
        };
        global.app.addRoundFee = (fee, roundNumber) => {
            modules.blocks.increaseRoundData({ fees: fee }, roundNumber);
        };
        global.app.getRealTime = epochTime => slots_1.default.getRealTime(epochTime);
        global.app.registerHook = (name, func) => {
            global.app.hooks[name] = func;
        };
        global.app.isCurrentBookkeeper = addr => modules.delegates.getBookkeeperAddresses().has(addr);
        const { appDir, dataDir } = options.appConfig;
        const BLOCK_HEADER_DIR = path.resolve(dataDir, 'blocks');
        const BLOCK_DB_PATH = path.resolve(dataDir, 'blockchain.db');
        adaptSmartDBLogger(options.appConfig);
        global.app.sdb = new asch_smartdb_1.AschCore.SmartDB(BLOCK_DB_PATH, BLOCK_HEADER_DIR);
        global.app.balances = new balance_manager_1.default(global.app.sdb);
        global.app.autoID = new auto_increment_1.default(global.app.sdb);
        global.app.events = new events_1.EventEmitter();
        global.app.util = {
            address: address_1.default,
            bignumber: bignumber,
            transactionMode: transaction_mode_1.default,
        };
        yield loadModels_1.default();
        yield loadContracts_1.default();
        yield loadInterfaces_1.default(options.library.network.app);
        global.app.contractTypeMapping[0] = 'basic.transfer';
        global.app.contractTypeMapping[1] = 'basic.setUserName';
        global.app.contractTypeMapping[2] = 'basic.setSecondPassphrase';
        global.app.contractTypeMapping[3] = 'basic.lock';
        global.app.contractTypeMapping[4] = 'basic.vote';
        global.app.contractTypeMapping[5] = 'basic.unvote';
        global.app.contractTypeMapping[10] = 'basic.registerDelegate';
        global.app.contractTypeMapping[100] = 'uia.registerIssuer';
        global.app.contractTypeMapping[101] = 'uia.registerAsset';
        global.app.contractTypeMapping[102] = 'uia.issue';
        global.app.contractTypeMapping[103] = 'uia.transfer';
    });
}
exports.default = runtime;
//# sourceMappingURL=runtime.js.map