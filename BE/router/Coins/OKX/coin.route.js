const express = require('express');
const router = express.Router();

const MiddlewareController = require('../../../controllers/middleware');
const InstrumentOKXV1Controller = require('../../../controllers/Coins/OKX/coin');


router.get('/getAll', MiddlewareController.verifyToken, InstrumentOKXV1Controller.getAll);
router.get('/sync', MiddlewareController.verifyToken, InstrumentOKXV1Controller.sync)

module.exports = router;
