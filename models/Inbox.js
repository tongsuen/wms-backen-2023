const mongoose = require('mongoose');

const InboxSchema = new mongoose.Schema({
  
    from:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
    to:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
    tos:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    }],
    subject:{
        type:String,
    },
    company:{
        type:String,
    },
    detail:{
        type:String,
    },
    accept:{
        type:Number, // 0 = pendding 1 = accept ,-1 = decline
        defalut:0
    },
    type:{
        type:Number,
        default:1, //1: send to system
    },
    item_out:{
        stock:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'stocks',
        },
        amount:{
            type:Number,
            default:0
        },
    },
    files:[{
        type:String,
    }],
    is_active:{
        type:Boolean,
        default:true
    },
    create_date : {
        type : Date,
        default : Date.now
    }
});
InboxSchema.index({subject:'text',company:'text',detail:'text'});
module.exports = Inbox = mongoose.model('inbox',InboxSchema)