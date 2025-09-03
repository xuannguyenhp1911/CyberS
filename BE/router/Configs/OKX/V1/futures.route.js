const express = require('express');
const router = express.Router();

const MiddlewareController = require('../../../../controllers/middleware');
const marginController = require('../../../../controllers/Configs/OKX/V1/futures');

router.post('/getAllStrategiesSpot', MiddlewareController.verifyToken, marginController.getAllStrategiesSpot);
router.post('/getLever', MiddlewareController.verifyToken, marginController.getLever);
router.get('/getAllSymbolSpot', MiddlewareController.verifyToken, marginController.getAllSymbolSpot);

router.post('/createStrategiesSpot', MiddlewareController.verifyToken, marginController.createStrategiesSpot)

router.put('/updateStrategiesSpotByID/:id', MiddlewareController.verifyToken, marginController.updateStrategiesSpotByID)
router.post('/updateStrategiesMultipleSpot', MiddlewareController.verifyToken, marginController.updateStrategiesMultipleSpot)
router.put('/addToBookmarkSpot/:id', MiddlewareController.verifyToken, marginController.addToBookmarkSpot)
router.put('/removeToBookmarkSpot/:id', MiddlewareController.verifyToken, marginController.removeToBookmarkSpot)

router.post('/deleteStrategiesItemSpot', MiddlewareController.verifyToken, marginController.deleteStrategiesItemSpot)
router.delete('/deleteStrategiesSpot/:id', MiddlewareController.verifyToken, marginController.deleteStrategiesSpot)
router.post('/deleteStrategiesMultipleSpot', MiddlewareController.verifyToken, marginController.deleteStrategiesMultipleSpot)

router.post('/copyMultipleStrategiesToSymbolSpot', MiddlewareController.verifyToken, marginController.copyMultipleStrategiesToSymbolSpot)
router.post('/copyMultipleStrategiesToBotSpot', MiddlewareController.verifyToken, marginController.copyMultipleStrategiesToBotSpot)

module.exports = router;
