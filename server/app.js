'use strict';

const util = require('util');
const log4js = require('log4js');

const config = require('./config');
const Server = require('./server');
const UsbIO2 = require('./usbio2');

const logger = log4js.getLogger();


class App {
  constructor() {
    this.counter_data = {
      type: "counter",
      total: 0,
      current: 0,
      bonus: 0,
      bonus_chain: 0,
      is_bonustime: false,
      is_chancetime: false,
    };
  }

  run() {
    logger.info("Start pcounter.js backend");

    const server = new Server(
      config.server.client_dir,
      config.server.port,
    );

    server.setup({
      'get': {
        '/export': (req, res) => {
          res.json(this.counter_data);
          res.sendStatus(200);
        }
      },
      'post': {
        '/import': (req, res) => {
          Object.keys(req.body).forEach((key) => {
            if(key in this.counter_data) {
              this.counter_data[key] = req.body[key];
            }
          });
          server.sendTextToClients(JSON.stringify(this.counter_data));
          res.sendStatus(200);
        },
      },
      'on_ws_connected': (ws) => {
        ws.send(JSON.stringify(this.counter_data));
      }
    });

    const GAMECNT_PORT = config.port.game;
    const BONUS_PORT = config.port.bonus;
    const CHANCETIME_PORT = config.port.chance_time;

    const usbio2 = new UsbIO2();
    usbio2.detect();
    usbio2.on('changed', (data, onbits, offbits) => {
      logger.debug(`Changed read value: ${data}, ${onbits}, ${offbits}`)
      let changed = false;

      if(onbits & CHANCETIME_PORT) {
        this.counter_data.is_chancetime = true;
        changed = true;
      }

      if(offbits & CHANCETIME_PORT) {
        this.counter_data.is_chancetime = false;
        this.counter_data.bonus_chain = 0;
        changed = true;
      }

      if(onbits & GAMECNT_PORT) {
        this.counter_data.total++;
        this.counter_data.current++;
        changed = true;
      }

      if(onbits & BONUS_PORT) {
        this.counter_data.bonus++;
        this.counter_data.is_bonustime = true;
        if(this.counter_data.is_chancetime) {
          this.counter_data.bonus_chain++;
        }
        changed = true;
      }

      if(offbits & BONUS_PORT) {
        this.counter_data.current = 0;
        this.counter_data.is_bonustime = false;
        changed = true;
      }

      if(changed) {
        server.sendTextToClients(JSON.stringify(this.counter_data));
        logger.debug("SEND: " + util.inspect(this.counter_data));
      }
    });
  }
}

module.exports = App;
