const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    media: {
        path: { type: String, required: true },
        filename: { type: String, required: true },
    },
    description: {
      type:String,
    },
    hashtags:{
        type:[String]
    },
    user: {
      type:mongoose.Schema.Types.ObjectId,
      ref:'User',
      required:true
    }
},
{timestamps:true}
);

const model = mongoose.model('Post', schema);

module.exports = model