const express = require('express');
const router = express.Router();

const MiddlewareController = require('../../../../controllers/middleware');
const PositionController = require('../../../../controllers/Positions/OKX/V1/position');

router.post('/getPriceLimitCurrent', MiddlewareController.verifyToken, PositionController.getPriceLimitCurrent);
router.post('/getBalanceWallet', MiddlewareController.verifyToken, PositionController.getBalanceWallet);
router.post('/getPosition', MiddlewareController.verifyToken, PositionController.getPosition);
router.post('/closeCoin', MiddlewareController.verifyToken, PositionController.closeCoin);
router.post('/closeMarket', MiddlewareController.verifyToken, PositionController.closeMarket);
router.post('/closeLimit', MiddlewareController.verifyToken, PositionController.closeLimit);
router.post('/closeAllPosition', MiddlewareController.verifyToken, PositionController.closeAllPosition);
router.post('/repayAll', MiddlewareController.verifyToken, PositionController.repayAll);

module.exports = router;