const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/auth');
const MiddlewareController = require('../controllers/middleware');


router.get('/', MiddlewareController.verifyToken, (req, res) => {
    res.customResponse(200, "Verify Successful", req.user)
})
router.post('/login', AuthController.login);
router.post('/loginSwitch',MiddlewareController.verifyToken, AuthController.loginSwitch);
router.post('/verifyTokenVIP',MiddlewareController.verifyToken, AuthController.verifyTokenVIP);


module.exports = router;
