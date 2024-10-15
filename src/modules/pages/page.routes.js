const express = require('express');
const router = express.Router();

const auth = require('../../middlewares/auth')
const controller = require('./page.controller')

router.route('/:pageID').get(auth, controller.getPage);
router.route('/:pageID/follow').post(auth, controller.follow);
router.route('/:pageID/unFollow').post(auth, controller.unFollow);
router.route('/:pageID/unRequest').post(auth, controller.unRequest);




module.exports = router