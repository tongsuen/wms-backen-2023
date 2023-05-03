const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  
    name:{
        type:String,
    },
    detail:{
        type:String,
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
    create_date : {
        type : Date,
        default : Date.now
    }
});
LocationSchema.index({detail:'text'});
module.exports = Location = mongoose.model('location',LocationSchema)