"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
class LoaderApi {
    constructor(modules, library) {
        this.isLoaded = false;
        this.onBlockchainReady = () => {
            this.isLoaded = true;
        };
        this.attachApi = () => {
            const router = express.Router();
            router.get('/status', this.status);
            router.get('/status/sync', this.sync);
            router.use((req, res) => {
                return res.status(500).json({ success: false, error: 'API endpoint not found' });
            });
            this.library.network.app.use('/api/loader', router);
            this.library.network.app.use((err, req, res, next) => {
                if (!err)
                    return next();
                this.library.logger.error(req.url, err.toString());
                return res.status(500).send({ success: false, error: err.toString() });
            });
        };
        this.status = (req, res, next) => {
            return res.json({
                loaded: this.isLoaded,
                now: this.modules.loader.loadingLastBlock.height,
                blocksCount: this.modules.loader.total,
            });
        };
        this.sync = (req, res, next) => {
            return res.json({
                syncing: this.modules.loader.syncing(),
                blocks: this.modules.loader.blocksToSync,
                height: this.modules.blocks.getLastBlock().height,
            });
        };
        this.modules = modules;
        this.library = library;
        this.attachApi();
    }
}
exports.default = LoaderApi;
//# sourceMappingURL=loaderApi.js.map