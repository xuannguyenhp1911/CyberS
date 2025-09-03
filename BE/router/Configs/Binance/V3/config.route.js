const express = require('express');
const router = express.Router();

const MiddlewareController = require('../../../../controllers/middleware');
const scannerController = require('../../../../controllers/Configs/Binance/V3/config');

router.post('/getAllConfigScannerV3', MiddlewareController.verifyToken, scannerController.getAllConfigScannerV3);

router.post('/createConfigScannerV3', MiddlewareController.verifyToken, scannerController.createConfigScannerV3)
router.post('/updateStrategiesMultipleScannerV3', MiddlewareController.verifyToken, scannerController.updateStrategiesMultipleScannerV3)
router.post('/copyMultipleStrategiesToBotScannerV3', MiddlewareController.verifyToken, scannerController.copyMultipleStrategiesToBotScannerV3)

router.post('/deleteStrategiesByIDScannerV3', MiddlewareController.verifyToken, scannerController.deleteStrategiesByIDScannerV3)
router.post('/deleteStrategiesMultipleScannerV3', MiddlewareController.verifyToken, scannerController.deleteStrategiesMultipleScannerV3)
router.post('/updateConfigByIDV3', MiddlewareController.verifyToken, scannerController.updateConfigByIDV3)
router.post('/handleBookmarkScannerV3', MiddlewareController.verifyToken, scannerController.handleBookmarkScannerV3)
router.get('/getFutureAvailable/:id', MiddlewareController.verifyToken, scannerController.getFutureAvailable)
router.post('/balanceWallet', MiddlewareController.verifyToken, scannerController.balanceWallet)

module.exports = router;
