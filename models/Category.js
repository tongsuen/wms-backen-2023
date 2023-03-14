const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
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
CategorySchema.index({name:'text'});
module.exports = Category = mongoose.model('category',CategorySchema)