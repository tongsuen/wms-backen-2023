const mongoose = require('mongoose');

const AdminNotificationSchema = new mongoose.Schema({
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
    order:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'order',   
    },
    file:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'file',   
    },
    avatar:{
        type:String,
    },
    type:{
        type:String,
        enum: ['request','import', 'export','message', 'other','file'],
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

module.exports = AdminNotification = mongoose.model('admin_notification',AdminNotificationSchema)