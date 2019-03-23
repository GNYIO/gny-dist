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
const util = require("util");
const router_1 = require("./utils/router");
class RouteWrapper {
    constructor() {
        this.hands = [];
        this.routePath = null;
    }
    get(routePath, handler) {
        this.handlers.push({ path: routePath, method: 'get', handler });
    }
    put(routePath, handler) {
        this.handlers.push({ path: routePath, method: 'put', handler });
    }
    post(routePath, handler) {
        this.handlers.push({ path: routePath, method: 'post', handler });
    }
    set path(val) {
        this.routePath = val;
    }
    get path() {
        return this.routePath;
    }
    get handlers() {
        return this.hands;
    }
}
const interfaceFiles = [];
function loadInterfaces(routes) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const file of interfaceFiles) {
            global.app.logger.info('loading interface', file);
            const rw = new RouteWrapper();
            file.class(rw);
            const router1 = new router_1.default();
            const router = router1.router;
            for (const h of rw.handlers) {
                router[h.method](h.path, (req, res) => {
                    (() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            const result = yield h.handler(req);
                            let response = { success: true };
                            if (util.isObject(result) && !Array.isArray(result)) {
                                response = _.assign(response, result);
                            }
                            else if (!util.isNullOrUndefined(result)) {
                                response.data = result;
                            }
                            res.send(response);
                        }
                        catch (e) {
                            res.status(500).send({ success: false, error: e.message });
                        }
                    }))();
                });
            }
            if (!rw.path) {
                rw.path = `/api/v2/${file.name}`;
            }
            routes.use(rw.path, router);
        }
    });
}
exports.default = loadInterfaces;
//# sourceMappingURL=loadInterfaces.js.map