const express = require('express');
const router = express.Router();

const MiddlewareController = require('../controllers/middleware');
const BotTypeController = require('../controllers/botType');

router.get('/getAll', MiddlewareController.verifyToken, BotTypeController.getAll);
router.post('/create', MiddlewareController.verifyToken, BotTypeController.create);
router.put('/update/:id', MiddlewareController.verifyToken, BotTypeController.update);
router.post('/deleteMultiple', MiddlewareController.verifyToken, BotTypeController.deleteMultiple);

module.exports = router;
