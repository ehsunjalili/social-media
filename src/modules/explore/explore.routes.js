const express = require('express');
const auth = require('../../middlewares/auth');
const controller = require('./explore.controller')
const router = express.Router();



router.route('/')
    .get(auth, controller.getExploreView)
    .post(auth,controller.search)

router.route('/:postID').get(auth, controller.getExploreFeedView);

module.exports = router