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
const fs = require("fs");
const http = require("http");
const https = require("https");
const socketio = require("socket.io");
const express = require("express");
const compression = require("compression");
const cors = require("cors");
const CIPHERS = `
  ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:
  ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:
  ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:
  DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:
  !aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA`;
function intNetwork(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let sslServer;
        let sslio;
        const expressApp = express();
        expressApp.use(compression({ level: 6 }));
        expressApp.use(cors());
        expressApp.options('*', cors());
        const server = http.createServer(expressApp);
        const io = socketio(server);
        if (options.appConfig.ssl.enabled) {
            const privateKey = fs.readFileSync(options.appConfig.ssl.options.key);
            const certificate = fs.readFileSync(options.config.ssl.options.cert);
            sslServer = https.createServer({
                key: privateKey,
                cert: certificate,
                ciphers: CIPHERS,
            }, expressApp);
            sslio = socketio(sslServer);
        }
        return {
            express,
            app: expressApp,
            server,
            io,
            sslServer,
            sslio,
        };
    });
}
exports.default = intNetwork;
//# sourceMappingURL=initNetwork.js.map