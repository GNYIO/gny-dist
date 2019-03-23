"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
class PeerApi {
    constructor(modules, library) {
        this.attachApi = () => {
            const router = express.Router();
            router.use((req, res, next) => {
                if (this.modules)
                    return next();
                return res.status(500).send({ success: false, error: 'Blockchain is loading' });
            });
            router.get('/', this.getPeers);
            router.get('/version', this.version);
            router.use((req, res) => {
                return res.status(500).send({ success: false, error: 'API endpoint not found' });
            });
            this.library.network.app.use('/api/peers', router);
            this.library.network.app.use((err, req, res, next) => {
                if (!err)
                    return next();
                this.library.logger.error(req.url, err.toString());
                return res.status(500).send({ success: false, error: err.toString() });
            });
        };
        this.getPeers = (req, res, next) => {
            this.modules.peer.findSeenNodesInDb((err, nodes) => {
                let peers = [];
                if (err) {
                    this.library.logger.error('Failed to find nodes in db', err);
                }
                else {
                    peers = nodes;
                }
                res.json({ count: peers.length, peers });
            });
        };
        this.version = (req, res, next) => {
            return res.json({
                version: this.library.config.version,
                build: this.library.config.buildVersion,
                net: this.library.config.netVersion,
            });
        };
        this.modules = modules;
        this.library = library;
        this.attachApi();
    }
}
exports.default = PeerApi;
//# sourceMappingURL=peerApi.js.map