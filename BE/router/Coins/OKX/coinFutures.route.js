const express = require('express');
const router = express.Router();

const MiddlewareController = require('../../../controllers/middleware');
const CoinOKXV1Controller = require('../../../controllers/Coins/OKX/coinFutures');


router.get('/getAll', MiddlewareController.verifyToken, CoinOKXV1Controller.getAll);
router.get('/sync', MiddlewareController.verifyToken, CoinOKXV1Controller.sync)

module.exports = router;
