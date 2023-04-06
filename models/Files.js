const mongoose = require('mongoose');

const FilesSchema = new mongoose.Schema({
    name:{
        type:String,
    },
    files:[{
        type:String,
    }],
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
    invoice:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'invoice',
    },
    ref_id:{
        type:String
    },
    type:{
        type:Number
    },
    request:{
        type:String
    },
    remark:{
        type:String
    },
    date_request:{
        type:String
    },
    is_active:{
        type:Boolean,
        default:true
    },
    create_date : {
        type : Date,
        default : Date.now
    }
});
FilesSchema.index({name:'text'});
module.exports = Files = mongoose.model('files',FilesSchema)