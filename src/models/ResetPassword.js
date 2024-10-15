const mongoose = require('mongoose');

const schema = new mongoose.Schema({
 user:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'User',
    required:true,
 },
 token:{
    type:String,
    required:true,
 },
 tokenExpireTime:{
    type:Number,
    required:true,
 }
});

const model = mongoose.model('ResetPassword', schema);

module.exports = model;