const hasAccessToPage = require('../../utils/hasAccessToPage');
const followModel = require('../../models/Follow');
const userModel = require('../../models/User');
const postModel = require('../../models/Post');
const likeModel = require('../../models/Like');
const saveModel = require('../../models/Save');
const commentModel = require('../../models/Comment');
const requestToFollowModel = require('../../models/RequestToFollow');
const getMediaFromRedis = require('../../utils/getMediaFromRedis');

module.exports.getPage = async (req, res, next) => {
  try {
    const user = req.user;
    const { pageID } = req.params;

    const isExistPage = await userModel.findOne({ _id: pageID });
    if (!isExistPage) {
      return res.redirect('/404')
    }

    const followed = await followModel.findOne({ follower: user._id, following: pageID });


    const hasAccess = await hasAccessToPage(user._id, pageID);
    const isRequested = await requestToFollowModel.findOne({ follower: user._id, following: pageID })

    const page = await userModel.findOne({ _id: pageID }, 'username name biography isVerified blue').lean();

    const media = await getMediaFromRedis(pageID);
    page.profilePicture = media.profilePicture;
    page.cover = media.cover;


    let followers = await followModel.find({ following: pageID }).populate('follower', 'username name blue');
    followers = followers.map((item) => item.follower);

    let followings = await followModel.find({ follower: pageID }).populate('following', 'username name  blue');
    followings = followings.map((item) => item.following);


    const allfollowings = followings.map(async follow => {
      const followProfile = await getMediaFromRedis(follow._id);
      const profilePicture = followProfile.profilePicture;
      return { ...follow.toObject(), profilePicture }
    })

    const followingsList = await Promise.all(allfollowings)

   

    const allfollowers = followings.map(async follower => {
      const followerProfile = await getMediaFromRedis(follower._id);
      const profilePicture = followerProfile.profilePicture;
      return { ...follower.toObject(), profilePicture }
    })

    const followersList = await Promise.all(allfollowers)
    


    const posts = await postModel.find({ user: pageID }).sort({ _id: -1 }).populate('user', 'name username').lean();


    const own = user._id.toString() == pageID;

    const likes = await likeModel.find({ user: user._id })
      .populate('user', '_id')
      .populate('post', '_id');

    const saves = await saveModel.find({ user: user._id })
      .populate('post', '_id');

    const comments = await commentModel.find()
      .populate('user');


    //* post likes
    const AllLikes = await likeModel.find()
      .populate('user')
      .lean();

    posts.forEach(async post => {
      post.likes = []
      AllLikes.forEach(like => {
        if (post._id.toString() == like.post._id.toString()) {
          post.likes.push(like)
        }
      })
    })

    //* Three peson who likes a post
    posts.forEach(post => {
      if (post.likes.length) {
        post.firstLike = post.likes[0]?.user
        post.secondLike = post.likes[1]?.user
        post.lastLike = post.likes[2]?.user
      }
    })

    posts.forEach((post) => {
      if (likes.length) {
        likes.forEach((like) => {
          if (like.post._id.toString() == post._id.toString()) {
            post.hasLike = true;
          }
        })
      }
    })

    posts.forEach((post) => {
      if (saves.length) {
        saves.forEach((save) => {
          if (save.post._id.toString() == post._id.toString()) {
            post.hasSave = true;
          }
        })
      }
    })

    posts.forEach(post => {
      post.comments = []
      if (comments.length) {
        comments.forEach(comment => {
          if (comment.post.toString() == post._id.toString()) {
            post.comments.push(comment);
          }
        })
      }
    })

    const viewUser = await userModel.findOne({ _id: user._id }).lean();
    viewUser.profilePicture = (await getMediaFromRedis(user._id)).profilePicture



    //* People to folllow (new users that no any followers)
    const users = await userModel.find()
    const peopleToFollow = [];

    const follows = await followModel.find();

    users.forEach(item => {
      let hasFollower = follows.some(follow => {
        return follow.following.toString() == item._id.toString()
      })
      if (!hasFollower && item._id.toString() != user._id.toString()) {
        peopleToFollow.push(item)
      }
    })

    const isAdminExistInPeopleToFollowList = peopleToFollow.some(admin => {
      return admin.role == 'ADMIN'
    })

    const admin = await userModel.findOne({ role: 'ADMIN' });

    const followedAdmin = await followModel.findOne({ follower: user._id, following: admin._id });

    if (!isAdminExistInPeopleToFollowList && !followedAdmin && admin._id.toString() != user._id.toString()) {
      peopleToFollow.unshift(admin)
    }


    const newPeopleToFollow = peopleToFollow.map(async people => {
      const peopleProfile = await getMediaFromRedis(people._id);
      const profilePicture = peopleProfile.profilePicture;
      return { ...people.toObject(), profilePicture }
    })

    const suggestToFollow = await Promise.all(newPeopleToFollow)


    //* Getting "Whats happening" posts
    let explorePosts = await postModel.find().populate('user').lean()
    explorePosts = explorePosts.reverse()
    let feedPosts = []
    explorePosts.forEach(post => {
      if (!post.user.private) {
        feedPosts.push(post)
      }
    })

    const happeningPosts = [];
    feedPosts.forEach(post => {
      if (post.media.path.split('.').pop() != 'mp4') {
        happeningPosts.push(post)
      }
    })

    let newestTopNineImages = []
    if (happeningPosts.length > 8) {
      for (let index = 0; index < 9; index++) {
        newestTopNineImages.push(happeningPosts[index])
      }
    }

    //* Getting trending now hashtags
    const pagesPosts = await postModel.find()
    const tags = [];

    pagesPosts.forEach(post => {
      if (post.hashtags.length) {
        post.hashtags.forEach(tag => {
          if (tag != '') {
            tags.push(tag)
          }
        })
      }
    })

    const tagCounts = tags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});

    const mostCommonTags = Object.keys(tagCounts)
      .sort((a, b) => tagCounts[b] - tagCounts[a])
      .slice(0, 6);


    if (!hasAccess) {
      return res.render('page/index', {
        followed: Boolean(followed),
        pageID,
        hasAccess: false,
        followers,//: followersList,
        followings, //: followingsList,
        posts: [],
        page,
        own,
        viewUser,
        isRequested,
        peopleToFollow : suggestToFollow,
        newestTopNineImages,
        mostCommonTags
      })
    }

    return res.render('page/index', {
      followed: Boolean(followed),
      pageID,
      hasAccess: true,
      followers, //: followersList,
      followings, //: followingsList,
      posts,
      page,
      own,
      viewUser,
      isRequested,
      peopleToFollow : suggestToFollow,
      newestTopNineImages,
      mostCommonTags
    })
  } catch (error) {
    next(error)
  }
}

module.exports.follow = async (req, res, next) => {
  try {
    const user = req.user;
    const { pageID } = req.params;
    const isExisPage = await userModel.findOne({ _id: pageID });
    if (!isExisPage) {
      req.flash('error', 'Page not found !');
      return res.redirect(`/pages/${pageID}`);
    }
    const isAlreadyFollowed = await followModel.findOne({ follower: user._id, following: pageID });
    if (isAlreadyFollowed) {
      req.flash('error', 'You already followed this page !');
      return res.redirect(`/pages/${pageID}`);
    }
    if (user._id == pageID) {
      req.flash('error', 'You cannot follow yourself !');
      return res.redirect(`/pages/${pageID}`);
    }

    const isPrivatePage = isExisPage.private
    if (isPrivatePage) {
      const isAlreadyRequested = await requestToFollowModel.findOne({
        follower: user._id,
        following: pageID
      })

      if (!isAlreadyRequested) {
        await requestToFollowModel.create({
          follower: user._id,
          following: pageID,
        })
        return res.redirect(`/pages/${pageID}`)
      }
      return res.redirect(`/pages/${pageID}`)

    } else {
      const follow = new followModel({
        follower: user._id,
        following: pageID,
      });
      await follow.save()
      return res.redirect(`/pages/${pageID}`)
    }

  } catch (error) {
    next(error)
  }
}

module.exports.unFollow = async (req, res, next) => {
  try {
    const user = req.user;
    const { pageID } = req.params;

    const unfollow = await followModel.findOneAndDelete({ follower: user._id, following: pageID });
    if (!unfollow) {
      req.flash('success', `You did't follow this page !!`);
      return res.redirect(`/pages/${pageID}`);
    }
    return res.redirect(`/pages/${pageID}`);
  } catch (error) {
    next(error)
  }
}

module.exports.unRequest = async (req, res, next) => {
  try {
    const user = req.user;
    const { pageID } = req.params;

    const page = await userModel.findOne({ _id: pageID })
    if (!page) {
      req.flash('error', 'Page not found please try again later !')
      return res.redirect(`/pages/${pageID}`);
    }

    const isExistRequest = await requestToFollowModel.findOne({ follower: user._id, following: pageID });
    if (!isExistRequest) {
      req.flash('error', 'Something went wrong !')
      return res.redirect(`/pages/${pageID}`);
    }

    await requestToFollowModel.findOneAndDelete({ _id: isExistRequest._id })
    return res.redirect(`/pages/${pageID}`);

  } catch (error) {
    next(error)
  }
}