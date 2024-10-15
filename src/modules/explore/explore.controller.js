const { getUserInfo } = require("../../utils/helper");
const postModel = require('../../models/Post');
const likeModel = require('../../models/Like');
const saveModel = require('../../models/Save');
const userModel = require('../../models/User');
const followModel = require('../../models/Follow');
const moment = require('moment');
const getMediaFromRedis = require('./../../utils/getMediaFromRedis')


module.exports.getExploreView = async (req, res, next) => {
    try {
        const user = req.user;
        const userInfo = await getUserInfo(user._id);
        const profilePicture = await (await getMediaFromRedis(userInfo._id)).profilePicture
        userInfo.profilePicture = profilePicture


        //* Getting explore posts
        let posts = await postModel.find().populate('user').lean()
        let feedPosts = []
        posts.forEach(post => {
            if (!post.user.private) {
                feedPosts.push(post)
            }
        })

        //* Sort explore posts by data for display newest post on top of page
        feedPosts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        res.render('explore/explore', {
            userInfo,
            feedPosts: feedPosts.reverse(),
            searching: false,
        });
    } catch (error) {
        next(error)
    }
}

module.exports.search = async (req, res, next) => {
    try {
        const user = req.user;
        const userInfo = await getUserInfo(user._id);
        const profilePicture = await (await getMediaFromRedis(userInfo._id)).profilePicture
        userInfo.profilePicture = profilePicture


        let { search } = req.body;
        const users = await userModel.find()
        let feedPosts = []
        let tagSearching = false;

        const isUserSearchTag = search.split('')
        if (isUserSearchTag[0] == '#') {
            tagSearching = true
            search = search.slice(1)
        }

        //* Preventing the display of posts of private pages
        const posts = await postModel.find().populate('user').lean();
        let myExplorPosts = []
        posts.forEach(post => {
            if (!post.user.private) {
                myExplorPosts.push(post)
            }
        })

        const relaredPosts = []
        myExplorPosts.forEach(post => {
            if (post.hashtags.includes(search)) {
                relaredPosts.push(post)
            }
        })

        if (search != '' && search != ' ') {
            users.forEach(result => {
                if (result.username.includes(search)) {
                    feedPosts.push(result)
                }
            })
        }

        feedPosts = feedPosts.map(async post => {
            const ownerProfile = await getMediaFromRedis(post._id);
            const profilePicture = ownerProfile.profilePicture;
            return { ...post.toObject(), profilePicture }
        })
    
        feedPosts = await Promise.all(feedPosts)

        res.render('explore/explore', {
            userInfo,
            feedPosts,
            searching: true,
            tagSearching,
            search,
            relaredPosts
        })

    } catch (error) {
        next(error)
    }
}

module.exports.getExploreFeedView = async (req, res, next) => {
    try {
        const user = req.user;
        const { postID } = req.params;
        const userInfo = await getUserInfo(user._id);
        const profilePicture = await (await getMediaFromRedis(userInfo._id)).profilePicture
        userInfo.profilePicture = profilePicture

        //* Getting explore posts then setting time template (time ago) for posts date
        let posts = await postModel.find().populate('user').lean()
        let feedPosts = []
        posts.forEach(post => {
            if (!post.user.private) {
                feedPosts.push(post)
            }
        })
        feedPosts.forEach(post => {
            const relativeTime = moment(post.createdAt).fromNow();
            post.time = relativeTime
        })

        feedPosts = feedPosts.map(async post => {
            const ownerProfile = await getMediaFromRedis(post.user._id);
            const profilePicture = ownerProfile.profilePicture;
            return { ...post, profilePicture }
        })

        feedPosts = await Promise.all(feedPosts)

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
        const AllLikes = await likeModel.find()
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

        //* popular posts
        const PostsSortedByMostLikes = feedPosts.sort((a, b) => b.likes.length - a.likes.length);
        const popular4Posts = PostsSortedByMostLikes.slice(0, 4);

        //* popular users
        const users = await userModel.find().lean()
        const followers = await followModel.find()

        users.forEach(user => {
            user.followerCount = 0
            followers.forEach(follower => {
                if (user._id.toString() == follower.following.toString()) {
                    user.followerCount += 1;
                }
            })
        })

        const userSortedByMostFollower = users.sort((a, b) => b.followerCount - a.followerCount);
        let popular4User = userSortedByMostFollower.slice(0, 4);

        popular4User = popular4User.map(async user => {
            const ownerProfile = await getMediaFromRedis(user._id);
            const profilePicture = ownerProfile.profilePicture;
            return { ...user, profilePicture }
        })
        popular4User = await Promise.all(popular4User)





        //* Sort feed posts by data for display newest post on top of feed
        feedPosts.sort((a, b) => {
            if (a._id.toString() === postID.toString()) return -1;
            if (b._id.toString() === postID.toString()) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.render('explore/explore-feed', {
            userInfo,
            feedPosts,
            popular4Posts,
            popular4User
        });
    } catch (error) {
        next(error)
    }
}