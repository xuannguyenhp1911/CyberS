const express = require('express');
const router = express.Router();

const MiddlewareController = require('../../../controllers/middleware');
const PositionController = require('../../../controllers/Orders/ByBit/orders');

router.post('/getAllOrder', MiddlewareController.verifyToken, PositionController.getAllOrder);
router.post('/cancelOrder', MiddlewareController.verifyToken, PositionController.cancelOrder);
router.post('/cancelOrderAll', MiddlewareController.verifyToken, PositionController.cancelOrderAll);

module.exports = router;