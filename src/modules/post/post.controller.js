const postModel = require('../../models/Post');
const likeModel = require('../../models/Like');
const saveModel = require('./../../models/Save');
const commentModel = require('../../models/Comment');
const { createPostValidationSchema } = require("./post.validators");
const hasAccessToPage = require('../../utils/hasAccessToPage');
const { getUserInfo } = require('../../utils/helper');
const getMediaFromRedis = require('./../../utils/getMediaFromRedis');

const path = require('path');
const fs = require('fs');


module.exports.showPostUploadView = async (req, res) => {
    const userInfo = await getUserInfo(req.user._id);
    const profilePicture = await (await getMediaFromRedis(userInfo._id)).profilePicture
    userInfo.profilePicture = profilePicture;

    res.render('post/upload', {
        userInfo
    });
}

module.exports.createPost = async (req, res, next) => {
    try {
        const { description, hashtags } = req.body;
        const user = req.user;
        const tags = hashtags.split(',');

        if (!req.file) {
            req.flash('error', 'Media is required !');
            return res.redirect('/posts');
        }
        await createPostValidationSchema.validate({ description }, { abortEarly: false, })
        const post = await postModel({
            media: {
                path: `/images/posts/${req.file.filename}`,
                filename: req.file.filename,
            },
            description,
            hashtags: tags,
            user: user._id,
        })
        await post.save()


        req.flash('success', 'Post created successfully !');
        return res.redirect('/')
    } catch (error) {
        next(error);
    }
}

module.exports.like = async (req, res, next) => {
    try {
        const user = req.user;
        const { postID } = req.body;

        const post = await postModel.findOne({ _id: postID });
        if (!post) {
            req.flash('error', 'You cannot like this post because it has already been deleted');
            return res.redirect('back');
        }

        const hasAccess = await hasAccessToPage(user._id, post.user.toString());
        if (!hasAccess) {
            req.flash('error', 'To like this post, you must first follow the relevant account.');
            return res.redirect('back');
        }

        const existingLike = await likeModel.findOne({ post: postID, user: user._id });
        if (existingLike) {
            return res.redirect('back');
        }

        const like = new likeModel({
            post: postID,
            user: user._id
        })

        await like.save();

        //* To reload page from section that user is there now 
        const referer = req.get('Referer');
        if (referer) {
            const redirectUrl = `${referer}#${postID}`;
            res.redirect(redirectUrl);
        } else {
            res.redirect(`/default-route#${postID}`);
        }

    } catch (error) {
        next(error)
    }
}

module.exports.dislike = async (req, res, next) => {
    try {
        const user = req.user;
        const { postID } = req.body;

        const like = await likeModel.findOne({ post: postID, user: user._id });
        if (!like) {
            return res.redirect('back')
        }

        await likeModel.findOneAndDelete({ _id: like._id });
        //* To reload page from section that user is there now 
        const referer = req.get('Referer');
        if (referer) {
            const redirectUrl = `${referer}#${postID}`;
            res.redirect(redirectUrl);
        } else {
            res.redirect(`/default-route#${postID}`);
        }
    } catch (error) {
        next(error)
    }
}

module.exports.save = async (req, res, next) => {
    try {
        const user = req.user;
        const { postID } = req.body;

        const post = await postModel.findOne({ _id: postID });
        if (!post) {
            req.flash('error', 'This post not exist now !');
            return res.redirect('back');
        }

        const hasAccess = await hasAccessToPage(user._id, post.user.toString());
        if (!hasAccess) {
            req.flash('error', 'To save this post, you must first follow the relevant account.');
            return res.redirect('back');
        }

        const existingSave = await saveModel.findOne({ post: postID, user: user._id });
        if (existingSave) {
            return res.redirect('back');
        }

        await saveModel.create({ post: postID, user: user._id });
        //* To reload page from section that user is there now 
        const referer = req.get('Referer');
        if (referer) {
            const redirectUrl = `${referer}#${postID}`;
            res.redirect(redirectUrl);
        } else {
            res.redirect(`/default-route#${postID}`);
        }

    } catch (error) {
        next(error)
    }
}

module.exports.unsave = async (req, res, next) => {
    try {
        const user = req.user;
        const { postID } = req.body;

        const removedSave = await saveModel.findOneAndDelete({ post: postID, user: user._id });
        if (!removedSave) {
            req.flash('error', 'There was a problem unsaving. Please try again later');
            return res.redirect('back');
        }
        //* To reload page from section that user is there now 
        const referer = req.get('Referer');
        if (referer) {
            const redirectUrl = `${referer}#${postID}`;
            res.redirect(redirectUrl);
        } else {
            res.redirect(`/default-route#${postID}`);
        }

    } catch (error) {
        next(error)
    }
}

module.exports.showSavesView = async (req, res, next) => {
    try {
        const user = req.user;

        const saves = await saveModel.find({ user: user._id })
            .populate({
                path: 'post',
                populate: {
                    path: 'user',
                    model: 'User'
                }
            })
            .lean();

        const likes = await likeModel.find({ user: user._id })
            .populate('post')
            .lean();



        saves.forEach(item => {
            likes.forEach(like => {
                if (item.post._id.toString() == like.post._id.toString()) {
                    item.post.hasLike = true;
                }
            })
        })

        const userInfo = await getUserInfo(user._id);
        const profilePicture = await (await getMediaFromRedis(userInfo._id)).profilePicture
        userInfo.profilePicture = profilePicture


        let feedPosts = saves.map(async post => {
            const ownerProfile = await getMediaFromRedis(post.post.user._id);
            const profilePicture = ownerProfile.profilePicture;
            return { ...post, profilePicture }
        })
    
        feedPosts = await Promise.all(feedPosts)
        
        return res.render('post/saves', {
            posts: feedPosts,
            userInfo,
        })
    } catch (error) {
        next(error)
    }
}

module.exports.removePost = async (req, res, next) => {
    try {
        const user = req.user;
        const { postID } = req.params;

        const post = await postModel.findOne({ _id: postID });
        if (!post || post.user.toString() != user._id.toString()) {
            req.flash('error', `You cant remove this post !`);
            return res.redirect('back');
        }

        const mediaPath = path.join(__dirname, '..', '..', '..', 'public', 'images', 'posts', post.media.filename)
        fs.unlinkSync(mediaPath, (err) => {
            if (err) {
                next(err)
            }
        })

        await likeModel.deleteMany({ post: postID });
        await saveModel.deleteMany({ post: postID });

        await postModel.findByIdAndDelete(postID);

        req.flash('success', 'Your post deleted successfully');
        return res.redirect('back');
    } catch (error) {
        next(error)
    }
}

module.exports.addComment = async (req, res, next) => {
    try {
        const user = req.user;
        const { content, postID } = req.body;

        const post = await postModel.findOne({ _id: postID });
        if (!post) {
            req.flash('error', 'There was a problem to submiting your comment !');
            return res.redirect('back');
        }

        const comment = new commentModel({ post: postID, user: user._id, content });
        await comment.save();

        req.flash('success', 'Your comment submited successfully')
        //* To reload page from section that user is there now 
        const referer = req.get('Referer');
        if (referer) {
            const redirectUrl = `${referer}#${postID}`;
            res.redirect(redirectUrl);
        } else {
            res.redirect(`/default-route#${postID}`);
        }
    } catch (error) {
        next(error)
    }
}

