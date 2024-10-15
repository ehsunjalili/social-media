const jwt = require('jsonwebtoken');
const userModel = require('../models/User')
module.exports = async (req, res, next) => {
    try {
        const token = req.cookies['access-token'];
        
        if (!token) {
            req.flash('error', 'Please Log in first !!');
            return res.redirect('/auth/login')
        }
        const payload = jwt.verify(token, process.env.JWT_SECRET); 
        if (!payload) {
            req.flash('error', 'Please Log in first !!');
            return res.redirect('/auth/login')
        }
        const userID = payload.userID;
        const user = await userModel.findOne({ _id: userID }).lean();
        if (!user) {
            req.flash('error', 'Please Log in first !!');
            return res.redirect('/auth/login')
        }
        req.user = user
        next()
    } catch (error) {
        next(error)
    }

}