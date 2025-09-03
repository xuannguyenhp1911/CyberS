const express = require('express');
const router = express.Router();


const MiddlewareController = require('../../../../controllers/middleware');
const spotController = require('../../../../controllers/Configs/OKX/V1/spot');

router.post('/getAllStrategiesSpot', MiddlewareController.verifyToken, spotController.getAllStrategiesSpot);
router.get('/getAllSymbolSpot', MiddlewareController.verifyToken, spotController.getAllSymbolSpot);

router.post('/createStrategiesSpot', MiddlewareController.verifyToken, spotController.createStrategiesSpot)

router.put('/updateStrategiesSpotByID/:id', MiddlewareController.verifyToken, spotController.updateStrategiesSpotByID)
router.post('/updateStrategiesMultipleSpot', MiddlewareController.verifyToken, spotController.updateStrategiesMultipleSpot)
router.put('/addToBookmarkSpot/:id', MiddlewareController.verifyToken, spotController.addToBookmarkSpot)
router.put('/removeToBookmarkSpot/:id', MiddlewareController.verifyToken, spotController.removeToBookmarkSpot)

router.post('/deleteStrategiesItemSpot', MiddlewareController.verifyToken, spotController.deleteStrategiesItemSpot)
router.delete('/deleteStrategiesSpot/:id', MiddlewareController.verifyToken, spotController.deleteStrategiesSpot)
router.post('/deleteStrategiesMultipleSpot', MiddlewareController.verifyToken, spotController.deleteStrategiesMultipleSpot)
router.post('/getFutureAvailable', MiddlewareController.verifyToken, spotController.getFutureAvailable)
router.post('/getSpotTotal', MiddlewareController.verifyToken, spotController.getSpotTotal)
router.post('/balanceWallet', MiddlewareController.verifyToken, spotController.balanceWallet)

router.post('/copyMultipleStrategiesToSymbolSpot', MiddlewareController.verifyToken, spotController.copyMultipleStrategiesToSymbolSpot)
router.post('/copyMultipleStrategiesToBotSpot', MiddlewareController.verifyToken, spotController.copyMultipleStrategiesToBotSpot)

// Other V1
router.post('/getSpotBorrowCheck', MiddlewareController.verifyToken, spotController.getSpotBorrowCheck)

module.exports = router;
