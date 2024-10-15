const express = require('express');
const router = express.Router();
const controller = require('./auth.controller')
const auth = require('../../middlewares/auth')

router.route('/register')
    .get(controller.showRegisterView)
    .post(controller.register);

router.route('/refresh-token', controller.refreshToken)

router.route('/login')
    .get(controller.showLoginView)
    .post(controller.login);

router.route('/forget-password')
    .get(controller.showForgetPasswordView)
    .post(controller.forgetPassword);

router.route('/reset-password/:token').get(controller.showResetPasswordView);
router.route('/reset-password').post(controller.resetPassword);

router.route('/verify').post(auth,controller.verifyView)
router.route('/verify-code').post(auth,controller.verify)

module.exports = router;