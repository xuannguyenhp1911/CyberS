const express = require('express');
const router = express.Router();

const MiddlewareController = require('../controllers/middleware');
const BotController = require('../controllers/bot');

router.get('/getAllBot', MiddlewareController.verifyToken, BotController.getAllBot);
router.get('/getAllBotForCopyTrading', MiddlewareController.verifyToken, BotController.getAllBotForCopyTrading);
router.get('/getAllBotActive', MiddlewareController.verifyToken, BotController.getAllBotActive);
router.get('/getAllBotByUserID/:id', MiddlewareController.verifyToken, BotController.getAllBotByUserID);
router.get('/getAllBotActiveByUserID/:id', MiddlewareController.verifyToken, BotController.getAllBotActiveByUserID);
router.get('/getAllBotOnlyApiKeyByUserID/:id', MiddlewareController.verifyToken, BotController.getAllBotOnlyApiKeyByUserID);
router.get('/getAllBotOnlyApiKey/:id', MiddlewareController.verifyToken, BotController.getAllBotOnlyApiKey);
router.get('/getAllBotBySameGroup/:id', MiddlewareController.verifyToken, BotController.getAllBotBySameGroup);
router.get('/:id', MiddlewareController.verifyToken, BotController.getByID);
router.post('/getAllBotByListID', MiddlewareController.verifyToken, BotController.getAllBotByListID);
router.post('/getAllBotByGroupCreatedByUserID', MiddlewareController.verifyToken, BotController.getAllBotByGroupCreatedByUserID);

router.post('/', MiddlewareController.verifyToken, BotController.createBot);
router.post('/updateFutureBalancePercent', MiddlewareController.verifyToken, BotController.updateFutureBalancePercent);
router.put('/:id', MiddlewareController.verifyToken, BotController.updateBot);
router.post('/setMargin', MiddlewareController.verifyToken, BotController.setMargin);
router.post('/setLever', MiddlewareController.verifyToken, BotController.setLever);
router.post('/setLeverByBit', MiddlewareController.verifyToken, BotController.setLeverByBit);
router.post('/setLeverBinance', MiddlewareController.verifyToken, BotController.setLeverBinance);
router.post('/setLeverSymbolBot', MiddlewareController.verifyToken, BotController.setLeverSymbolBot);
router.post('/setLeverSymbolBotFutures', MiddlewareController.verifyToken, BotController.setLeverSymbolBotFutures);
router.post('/getApiInfo', MiddlewareController.verifyToken, BotController.getApiInfo);
router.get('/getTotalFutureSpot/:id', MiddlewareController.verifyToken, BotController.getTotalFutureSpot)
router.post('/getTotalFutureSpotByBot', MiddlewareController.verifyToken, BotController.getTotalFutureSpotByBot);
router.post('/getTotalFutureBotByBotType', MiddlewareController.verifyToken, BotController.getTotalFutureBotByBotType);

router.post('/deleteBot', MiddlewareController.verifyToken, BotController.deleteBot);
router.post('/updateBotCopyTrading', MiddlewareController.verifyToken, BotController.updateBotCopyTrading);

// router.post('/deleteMultipleBot', MiddlewareController.verifyToken, BotController.deleteMultipleBot);


module.exports = router;
