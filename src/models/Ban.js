const mongoose = require('mongoose');

const schema = new mongoose.Schema({
 email:{
    type: String,
    required:true,
 }
})

const model = mongoose.model('Ban',schema);

module.exports = model;