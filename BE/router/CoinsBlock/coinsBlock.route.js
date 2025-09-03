const express = require('express');
const router = express.Router();
const MiddlewareController = require('../../controllers/middleware');
const BotTypeController = require('../../controllers/CoinsBlock/coin');

router.get('/getAll', MiddlewareController.verifyToken, BotTypeController.getAll);
router.post('/getAllByMarket', MiddlewareController.verifyToken, BotTypeController.getAllByMarket);
router.post('/create', MiddlewareController.verifyToken, BotTypeController.create);
router.post('/getAllIDScannerForBlack', MiddlewareController.verifyToken, BotTypeController.getAllIDScannerForBlack);
router.put('/update/:id', MiddlewareController.verifyToken, BotTypeController.update);

module.exports = router;
