const express = require('express');
const router = express.Router();

const MiddlewareController = require('../../../controllers/middleware');
const coinController = require('../../../controllers/Coins/Binance/coinFutures');

router.get('/getAllCoin', MiddlewareController.verifyToken, coinController.getAllCoin);
router.get('/getAllCoinDelist', MiddlewareController.verifyToken, coinController.getAllCoinDelist);

router.get('/syncCoin', MiddlewareController.verifyToken, coinController.syncCoin)

module.exports = router;
