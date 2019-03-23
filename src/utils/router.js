"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const express = require("express");
class Router {
    constructor() {
        this.router = express.Router();
        this.router.map = this.map;
    }
    map(root, config) {
        Object.keys(config).forEach((param) => {
            const params = param.split(' ');
            const method = params[0];
            const route = params[1];
            if (params.length !== 2 || ['post', 'get', 'put'].indexOf(method) === -1) {
                throw Error('Wrong router map config');
            }
            this[method](route, (req, res) => {
                const reqParams = {
                    body: method === 'get' ? req.query : req.body,
                    params: req.params,
                };
                root[config[param]](reqParams, (err, res) => {
                    if (err) {
                        return res.json({ success: false, error: err });
                    }
                    return res.json(_.assign({ success: true }, res));
                });
            });
        });
    }
}
exports.default = Router;
//# sourceMappingURL=router.js.map