const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
   
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
    name:{
        type:String,
        required:true,
    },
    
    detail:{
        type:String,
    },
    x:{
        type:Number,
    },
    y:{
        type:Number,
    },
    z:{
        type:Number,
    },
    weight:{
        type:Number,
    },
    unit:{
        type:String,
    },
    sub_unit:{
        type:String,
    },
    item_per_unit:{
        type:Number,
        default:1
    },
    original_price:{
        type:Number,
        default:0
    },
    price:{
        type:Number,
        default:0
    },
    image:{
            type:String
    },
    images:[
        {
            type:String
        }
    ],
    is_active:{
        type:Boolean,
        default:true
    },
    create_date : {
        type : Date,
        default : Date.now
    }
});
ProductSchema.index({name:'text',sub_unit:'text',unit:'text',images:'text'});
module.exports = Product = mongoose.model('product',ProductSchema)