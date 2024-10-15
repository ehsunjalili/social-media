const express = require('express');
const controller = require('./home.controller');
const auth = require('../../middlewares/auth');
const router = express.Router();

router.route('/').get(auth,controller.showHomeView);

router.route('/accept-request').post(auth,controller.acceptRequest);
router.route('/decline-request').post(auth,controller.declineRequest);



module.exports = router;