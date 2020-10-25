'use strict';

const log4js = require('log4js');
const logger = log4js.getLogger();

logger.level = 'debug';

const App = require('./app');
new App().run();
