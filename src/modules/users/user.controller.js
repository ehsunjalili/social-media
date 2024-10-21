const userModel = require('../../models/User');
const banModel = require('../../models/Ban');
const likeModel = require('../../models/Like');
const commentModel = require('../../models/Comment');
const followModel = require('../../models/Follow');
const postModel = require('../../models/Post');
const requestToFollowModel = require('../../models/RequestToFollow');
const saveModel = require('../../models/Save');
const { registerValidationSchema } = require('./user.validators');
const redisClient = require('../../redis');
const getMediaFromRedis = require('../../utils/getMediaFromRedis');


module.exports.showPageEditeView = async (req, res) => {
  const user = await userModel.findOne({ _id: req.user._id });
  const isPrivatePage = user.private

  
const media = await getMediaFromRedis(user._id);
const profilePicture = media.profilePicture;

  res.render('user/edit', {
    user,
    isPrivatePage,
    profilePicture,
  });
}

module.exports.updateProfile = async (req, res, next) => {
  try {
    const { name, username, email, biography, private } = req.body
    await registerValidationSchema.validate({
      email,
      username,
      biography
    }, {
      abortEarly: false,
    })


    const isUserBanned = await banModel.findOne({ email })
    if (isUserBanned) {
      req.flash('error', 'This email already used, please set another email');
      return res.redirect('back');
    }

    const isEmailChanged = await userModel.findOne({ email });

    if (!isEmailChanged) {
      await userModel.findOneAndUpdate({ _id: req.user._id }, { isVerified: false });
    } else if (isEmailChanged._id.toString() != req.user._id.toString()) {
      req.flash('error', 'This email already used, please set another email');
      return res.redirect('back');
    }

    const isUsernameAlreadyExist = await userModel.findOne({ username });
    if (isUsernameAlreadyExist) {
      if (isUsernameAlreadyExist._id.toString() != req.user._id.toString()) {
        req.flash('error', 'This username already used, please set another username');
        return res.redirect('back');
      }
    }




    const privateMode = private ? true : false

    const userID = req.user._id

    const currentUser = await userModel.findOne({ _id: userID })

    const profilePath = req.files.profile ? `/${req.files.profile[0].filename}` : `${currentUser.profilePicture}`;

    const coverPath = req.files.cover ? `/${req.files.cover[0].filename}` : `${currentUser.cover}`;


  

    const user = await userModel.findOneAndUpdate(
      { _id: userID },
      {
        // profilePicture: profilePath,
        // cover: coverPath,
        name,
        email,
        username,
        biography,
        private: privateMode
      },
      { new: true } // Return updated user document
    )

    if (!user) {
      req.flash('error', 'User not found !!')
    }

    const userPictures = {
      cover : coverPath,
      profilePicture : profilePath,
    }

    await redisClient.set(`profiles:${user._id}`, JSON.stringify(userPictures));


    req.flash('success', 'Your profile updated successfully');
    return res.redirect('/users/edit-profile');


  } catch (error) {
    next(error)
  }
}

module.exports.ban = async (req, res, next) => {
  try {
    const user = req.user;
    const { targetID } = req.body;

    if (user.role != 'ADMIN') {
      req.flash('You cannot ban anyone !');
      return res.redirect('back');
    }

    const reportedUser = await userModel.findOne({ _id: targetID });
    if (!reportedUser) {
      req.flash('error', 'User not found !')
      return res.redirect('back');
    }

    if (reportedUser.role == 'ADMIN') {
      req.flash('error', 'Banning the admin is against the rules of the app !')
      return res.redirect('back');
    }

    const isAlreadyBan = await banModel.findOne({ email: reportedUser.email });
    if (isAlreadyBan) {
      req.flash('error', 'This user already banned !');
      return res.redirect('back');
    }

    const ban = new banModel({
      email: reportedUser.email
    });

    await ban.save()

    await likeModel.deleteMany({ user: reportedUser._id });

    const likes = await likeModel.find().populate('post').lean();
    likes.forEach(async like => {
      if (like.post.user.toString() == reportedUser._id.toString()) {
        await likeModel.findOneAndDelete({ _id: like._id })
      }
    })

    await commentModel.deleteMany({ user: reportedUser._id });

    // const comments = await commentModel.find().populate('post').lean();
    // console.log(comments);

    // comments.forEach(async comment => {
    //   if (comment.post.user.toString() == reportedUser._id.toString()) {
    //     await commentModel.findOneAndDelete({ _id: comment._id })
    //   }
    // })

    await followModel.deleteMany({ $or: [{ follower: reportedUser._id }, { following: reportedUser._id }] });

    await postModel.deleteMany({ user: reportedUser._id });

    await requestToFollowModel.deleteMany({ $or: [{ follower: reportedUser._id }, { following: reportedUser._id }] });

    await saveModel.deleteMany({ user: reportedUser._id });

    const saves = await saveModel.find().populate('post').lean();
    saves.forEach(async save => {
      if (save.post.user.toString() == reportedUser._id.toString()) {
        await saveModel.findOneAndDelete({ _id: save._id })
      }
    });

    await redisClient.del(`profiles:${reportedUser._id}`);

    await userModel.findByIdAndDelete(reportedUser._id);

    req.flash('success', 'User banned successfully')
    return res.redirect(`/pages/${user._id}`);


  } catch (error) {
    next(error)
  }
}

module.exports.logOut = async (req, res, next) => {

  for (const cookie in req.cookies) {
    res.clearCookie(cookie)
  }
  res.redirect('/auth/login')
}
