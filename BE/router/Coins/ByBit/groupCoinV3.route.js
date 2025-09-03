const express = require('express');
const router = express.Router();

const MiddlewareController = require('../../../controllers/middleware');
const BotTypeController = require('../../../controllers/Coins/ByBit/groupCoinV3');

router.get('/getAll', MiddlewareController.verifyToken, BotTypeController.getAll);
router.post('/create', MiddlewareController.verifyToken, BotTypeController.create);
router.put('/update/:id', MiddlewareController.verifyToken, BotTypeController.update);
router.post('/delete', MiddlewareController.verifyToken, BotTypeController.delete);

module.exports = router;
