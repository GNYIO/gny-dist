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
const express = require("express");
const block_reward_1 = require("../../src/utils/block-reward");
class BlocksApi {
    constructor(modules, library) {
        this.loaded = false;
        this.blockreward = new block_reward_1.default();
        this.onBlockchainReady = () => {
            this.loaded = true;
        };
        this.getBlock = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { query } = req;
            const idOrHeight = this.library.joi.object().keys({
                id: this.library.joi.string().min(1),
                height: this.library.joi.number().min(0),
            }).xor('id', 'height');
            const report = this.library.joi.validate(query, idOrHeight);
            if (report.error) {
                return next(report.error.message);
            }
            try {
                let block;
                if (query.id) {
                    block = yield global.app.sdb.getBlockById(query.id);
                }
                else if (query.height !== undefined) {
                    block = yield global.app.sdb.getBlockByHeight(query.height);
                }
                if (!block) {
                    return next('Block not found');
                }
                return res.json({ block: block });
            }
            catch (e) {
                this.library.logger.error(e);
                return next('Server error');
            }
        });
        this.getBlocks = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { query } = req;
            const offset = query.offset ? Number(query.offset) : 0;
            const limit = query.limit ? Number(query.limit) : 20;
            let minHeight;
            let maxHeight;
            let needReverse = false;
            if (query.orderBy === 'height:desc') {
                needReverse = true;
                maxHeight = this.modules.blocks.getLastBlock().height - offset;
                minHeight = (maxHeight - limit) + 1;
                minHeight = minHeight > 0 ? minHeight : 0;
            }
            else {
                minHeight = offset;
                maxHeight = (offset + limit) - 1;
            }
            const withTransactions = !!query.transactions;
            try {
                let blocks = yield this.modules.blocks.getBlocks(minHeight, maxHeight, withTransactions);
                if (needReverse) {
                    blocks = _.reverse(blocks);
                }
                const count = global.app.sdb.blocksCount;
                return res.json({ count, blocks });
            }
            catch (err) {
                return next(err.message);
            }
        });
        this.getHeight = (req, res, next) => {
            const height = this.modules.blocks.getLastBlock().height;
            return res.json({ height });
        };
        this.getMilestone = (req, res, next) => {
            const height = this.modules.blocks.getLastBlock().height;
            const milestone = this.blockreward.calculateMilestone(height);
            return res.json({ milestone });
        };
        this.getReward = (req, res, next) => {
            const height = this.modules.blocks.getLastBlock().height;
            const reward = this.blockreward.calculateReward(height);
            return res.json({ reward });
        };
        this.getSupply = (req, res, next) => {
            const height = this.modules.blocks.getLastBlock().height;
            const supply = this.blockreward.calculateSupply(height);
            return res.json({ supply });
        };
        this.getStatus = (req, res, next) => {
            const height = this.modules.blocks.getLastBlock().height;
            const fee = this.library.base.block.calculateFee();
            const milestone = this.blockreward.calculateMilestone(height);
            const reward = this.blockreward.calculateReward(height);
            const supply = this.blockreward.calculateSupply(height);
            return res.json({
                height,
                fee,
                milestone,
                reward,
                supply,
            });
        };
        this.modules = modules;
        this.library = library;
        this.attachApi();
    }
    attachApi() {
        const router = express.Router();
        router.use((req, res, next) => {
            if (this.modules && this.loaded === true)
                return next();
            return res.status(500).send({
                success: false,
                error: 'Blockchain is loading',
            });
        });
        router.get('/get', this.getBlock);
        router.get('/', this.getBlocks);
        router.get('/getHeight', this.getHeight);
        router.get('/getMilestone', this.getMilestone);
        router.get('/getReward', this.getReward);
        router.get('/getSupply', this.getSupply);
        router.get('/getStatus', this.getStatus);
        router.use((req, res) => {
            res.status(500).send({ success: false, error: 'API endpoint not found' });
        });
        this.library.network.app.use('/api/blocks', router);
        this.library.network.app.use((err, req, res, next) => {
            if (!err)
                return next();
            this.library.logger.error(req.url, err.toString());
            return res.status(500).send({
                success: false,
                error: err.toString(),
            });
        });
    }
}
exports.default = BlocksApi;
//# sourceMappingURL=blocksApi.js.map