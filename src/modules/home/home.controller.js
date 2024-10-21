const { getUserInfo } = require("../../utils/helper");
const followModel = require('../../models/Follow');
const postModel = require('../../models/Post');
const likeModel = require('../../models/Like');
const saveModel = require('../../models/Save');
const requestToFollowModel = require('../../models/RequestToFollow');
const userModel = require('../../models/User');
const moment = require('moment');
const getMediaFromRedis = require("../../utils/getMediaFromRedis");

module.exports.showHomeView = async (req, res) => {
    const user = req.user;
    const userInfo = await getUserInfo(user._id);


    let requests = await requestToFollowModel.find({ following: user._id }).populate('follower', 'username  blue')
    if (!user.private) {
        const allRequests = await requestToFollowModel.find({ following: user._id });
        allRequests.forEach(async request => {
            await followModel.create({
                follower: request.follower,
                following: request.following,
            })
            await requestToFollowModel.findOneAndDelete({ _id: request._id })
        })
    }

    const newRequests = requests.map(async request => {
        const requestProfile = await (await getMediaFromRedis(request._id));
        const profilePicture = requestProfile.profilePicture;
        return { ...request.toObject(), profilePicture }
    })

    const requestsNotif = await Promise.all(newRequests)


    const userFollowing = await followModel.find({ follower: user._id }, 'following');
    let posts = await postModel.find().populate('user').lean();
    posts.forEach(post => {
        const relativeTime = moment(post.createdAt).fromNow();
        post.time = relativeTime
    })

    //* Getting feed posts
    let feedPosts = []
    posts.forEach(post => {
        if (post.user._id.toString() == userInfo._id) {
            feedPosts.push(post)
        }
    })

    if (userFollowing.length) {
        userFollowing.forEach(following => {
            posts.forEach(post => {
                if (post.user._id.toString() == following.following.toString()) {
                    feedPosts.push(post)
                }
            })
        })
    }

    const likes = await likeModel.find({ user: user._id })
        .populate('post')
        .populate('user')
        .lean();

    const saves = await saveModel.find({ user: user._id })
        .populate('post')
        .lean();

    //* Highlighting posts that has liked by user
    feedPosts.forEach(item => {
        likes.forEach(like => {
            if (item._id.toString() == like.post._id.toString()) {
                item.hasLike = true;
            }
        })
    })

    //* Highlighting posts that has saved by user
    feedPosts.forEach(item => {
        saves.forEach(save => {
            if (item._id.toString() == save.post._id.toString()) {
                item.hasSave = true;
            }
        })
    })

    //* post likes
    let AllLikes = await likeModel.find()
        .populate('user')
        .lean();

    feedPosts.forEach(async post => {
        post.likes = []
        AllLikes.forEach(like => {
            if (post._id.toString() == like.post._id.toString()) {
                post.likes.push(like)
            }
        })
    })

    //* Three peson who likes a post
    feedPosts.forEach(post => {
        if (post.likes.length) {
            post.firstLike = post.likes[0]?.user
            post.secondLike = post.likes[1]?.user
            post.lastLike = post.likes[2]?.user
        }
    })




    //* Sort feed posts by data for display newest post on top of feed
    feedPosts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    feedPosts = feedPosts.map(async post => {
        const ownerProfile = await getMediaFromRedis(post.user._id);
        const profilePicture = ownerProfile.profilePicture;
        return { ...post, profilePicture }
    })

    feedPosts = await Promise.all(feedPosts)



    const lastFollowers = await followModel.find({ following: user._id }).populate('follower', 'username  blue').lean();

    const updatedFollowers = lastFollowers.map(async (follower) => {
        const media = await getMediaFromRedis(follower.follower._id);
        const profilePicture = media.profilePicture;
        return { ...follower, profilePicture };
    })

    const finalFollowers = await Promise.all(updatedFollowers)



    //* How long have they been following me
    finalFollowers.forEach(follower => {
        const relativeTime = moment(follower.createdAt).fromNow();
        follower.time = relativeTime
    })

    //* Sort follow notifies by date
    finalFollowers.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    //* Likes notifies 
    const myPosts = []
    feedPosts.forEach(post => {
        if (post.user._id.toString() == user._id.toString()) {
            myPosts.push(post)
        }
    })

    const likesNotifies = myPosts.sort((a, b) => {
        const dateA = new Date(a.likes[a.likes.length - 1]?.createdAt);
        const dateB = new Date(b.likes[b.likes.length - 1]?.createdAt);
        return dateB - dateA;
    });


    likesNotifies.forEach(like => {
        like.lastOfLike = like.likes.length ? like.likes.pop() : undefined
    })





    const media = await getMediaFromRedis(user._id)
    const profilePicture = media.profilePicture;

    res.render('index', {
        userInfo,
        feedPosts: feedPosts.reverse(),
        requests: requestsNotif,
        lastFollowers: finalFollowers.reverse(),
        likesNotifies,
        profilePicture,
    });
}

module.exports.acceptRequest = async (req, res, next) => {
    try {
        const { requestID } = req.body;

        const request = await requestToFollowModel.findOne({ _id: requestID });
        if (!request) {
            req.flash('error', 'You cannot accept this request, please try again later !')
            return res.redirect('back');
        }

        const follower = await userModel.findOne({ _id: request.follower });
        if (!follower) {
            req.flash('error', 'You cannot accept this request, please try again later !')
            return res.redirect('back');
        }

        const accept = new followModel({
            follower: request.follower,
            following: request.following
        })

        await accept.save();

        await requestToFollowModel.findByIdAndDelete(request._id)
        return res.redirect('back');

    } catch (error) {
        next(error)
    }
}

module.exports.declineRequest = async (req, res, next) => {
    try {
        const { requestID } = req.body;

        const request = await requestToFollowModel.findOne({ _id: requestID });
        if (!request) {
            req.flash('error', 'You cannot decline this request, please try again later !')
            return res.redirect('back');
        }

        const follower = await userModel.findOne({ _id: request.follower });
        if (!follower) {
            req.flash('error', 'You cannot decline this request, please try again later !')
            return res.redirect('back');
        }

        await requestToFollowModel.findByIdAndDelete(request._id)
        return res.redirect('back');

    } catch (error) {
        next(error)
    }
}

