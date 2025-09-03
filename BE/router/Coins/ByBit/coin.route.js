const express = require('express');
const router = express.Router();

const MiddlewareController = require('../../../controllers/middleware');
const instrumentsInfoController = require('../../../controllers/Coins/ByBit/coin');

router.get('/getAll', MiddlewareController.verifyToken, instrumentsInfoController.getAll);
router.get('/sync', MiddlewareController.verifyToken, instrumentsInfoController.sync)

module.exports = router;
