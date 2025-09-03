const express = require('express');
const router = express.Router();

const MiddlewareController = require('../controllers/middleware');
const RoleController = require('../controllers/role');

router.get('/:roleName', MiddlewareController.verifyToken, RoleController.getByRoleName);

module.exports = router;
