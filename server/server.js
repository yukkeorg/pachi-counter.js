'use strict';

const log4js = require("log4js");
const http = require("http");
const express = require("express");
const WebSocket = require("ws");

const logger = log4js.getLogger();


class Server {
  constructor(public_dir, port=18888) {
    this.port = port;
    this.public_dir = public_dir;

    this.app = null;
    this.wss = null;
  }

  setup(options) {
    this.app = express();
    this.app.disable('x-powered-by');

    this.app.use(express.static(this.public_dir));
    logger.info('Static file path: ' + this.public_dir);

    this.app.use(express.json());

    for(const method of ['get', 'post', 'put', 'delete']) {
      if(method in options) {
        const routes = options[method];
        Object.keys(routes).forEach((key) => {
          this.app[method](key, routes[key]);
        });
      }
    }

    const server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: server });
    if(options.on_ws_connected) {
      this.wss.on('connection', (ws) => {
          options.on_ws_connected(ws);
          logger.info("websocket: Client Connected.");
      });
    }

    server.listen(this.port, () => {
      logger.info(`Server is listening on port ${this.port}`);
    });
  }

  sendTextToClients(data) {
    if(this.wss) {
      this.wss.clients.forEach((client) => {
        if(client !== this.wss && client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    }
  }
}

module.exports = Server;
