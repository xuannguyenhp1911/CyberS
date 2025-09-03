const express = require('express');
const router = express.Router();

const MiddlewareController = require('../controllers/middleware');
const BotTypeController = require('../controllers/servers');

router.get('/restartByServerIP/:id', MiddlewareController.verifyToken, BotTypeController.restartByServerIP);
router.get('/closeAllBotForUpCodeByServerIP/:id', MiddlewareController.verifyToken, BotTypeController.closeAllBotForUpCodeByServerIP);
router.get('/getAll', MiddlewareController.verifyToken, BotTypeController.getAll);
router.post('/create', MiddlewareController.verifyToken, BotTypeController.create);
router.post('/getAllServerByBotType', MiddlewareController.verifyToken, BotTypeController.getAllServerByBotType);
router.post('/addBotToServer', MiddlewareController.verifyToken, BotTypeController.addBotToServer);
router.post('/editServerBot', MiddlewareController.verifyToken, BotTypeController.editServerBot);
router.put('/update/:id', MiddlewareController.verifyToken, BotTypeController.update);
router.delete('/delete/:id', MiddlewareController.verifyToken, BotTypeController.delete);

module.exports = router;
