const express = require('express');
const router = express.Router();
const controller = require('./user.controller');
const auth = require('../../middlewares/auth');
const { multerStorage } = require('../../middlewares/uploaderConfigs')

const upload = multerStorage('public/images/profiles', /jpeg|jpg|png|webp/ );

router.route('/edit-profile').get(auth, controller.showPageEditeView);
router.route('/profile-picture').post(auth, upload.fields([
    { name: 'profile', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]), controller.updateProfile);


router.route('/ban-user').post(auth, controller.ban);

router.route('/log-out').get(controller.logOut);

module.exports = router;