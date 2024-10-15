const redisClient = require("../redis");

module.exports = async (userID) => {
    let userMedia = await redisClient.get(`profiles:${userID}`);
    let profilePicture = '/images/Default.jpg';
    let cover = '/images/profile_header_default.png';
    if (userMedia) {
        userMedia = JSON.parse(userMedia)
        if (userMedia.profilePicture == 'undefined') {
            profilePicture = '/images/Default.jpg';
        } else {
            profilePicture = userMedia.profilePicture;
        }
        if (userMedia.cover == 'undefined') {
            cover = '/images/profile_header_default.png';
        } else {
            cover = userMedia.cover
        }
    }
    return {
        profilePicture,
        cover,
    }
}