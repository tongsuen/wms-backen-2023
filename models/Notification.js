const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
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
        type:String,
        enum: ['import', 'export','message', 'other'],
    },
    title:{
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

module.exports = Notification = mongoose.model('notification',NotificationSchema)