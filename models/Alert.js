const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',   
    },
    by_user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',   
    },
    inbox:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'inbox',   
    },
    invoice:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'invoice',   
    },
    avatar:{
        type:String,
    },
    type:{
        type:Number,
    },
    subject:{
        type:String,
    },
    sub_subject:{
        type:String,
    },
    detail:{
        type:String,
    },
    is_read:{
        type:Boolean,
        default:false
    },

    create_date : {
        type : Date,
        default : Date.now
    }
});

module.exports = Alert = mongoose.model('alert',AlertSchema)