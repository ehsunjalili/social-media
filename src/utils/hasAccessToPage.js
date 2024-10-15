const userModel = require('../models/User');
const followModel = require('../models/Follow');

module.exports = async (userID,pageID) => {
 try {
    if (userID == pageID) return true;

    const page = await userModel.findOne({_id:pageID});
    if (!page.private) return true;

    const followed = await followModel.findOne({follower:userID,following:pageID});
    if(!followed) return false;

    return true;

 } catch (error) {
    //codes
 }
}