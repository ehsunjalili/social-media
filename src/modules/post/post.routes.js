const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth')
const verify = require('../../middlewares/accountVerify')
const controller = require('./post.controller')
const { multerStorage } = require('../../middlewares/uploaderConfigs')

const upload = multerStorage('public/', /jpeg|jpg|png|webp|mp4|mkv/ )

router.route('/')
    .get(auth, verify, controller.showPostUploadView)
    .post(auth, upload.single('media'), controller.createPost);


router.route('/like').post(auth, controller.like);
router.route('/dislike').post(auth, controller.dislike);

router.route('/save').post(auth, controller.save);
router.route('/unsave').post(auth, controller.unsave);
router.route('/saves').get(auth, controller.showSavesView);

router.route('/:postID/remove').post(auth, controller.removePost);





module.exports = router