const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
   
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
    name:{
        type:String,
        required:true,
        unique: true,
    },
    main_code:{
        type:String,
    
    },
    sub_code:{
        type:String,
    },
    model:{
        type:String,
    },
    detail:{
        type:String,
    },
    type:{
        type:String,
    },
    x:{
        type:Number,
        defaul:0
    },
    y:{
        type:Number,
        defaul:0
    },
    z:{
        type:Number,
        defaul:0
    },
    weight:{
        type:Number,
        defaul:0
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
    item_in_pallate:{
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
ProductSchema.index({name:'text',sub_unit:'text',main_code:'text',sub_code:'text',unit:'text',images:'text'});
module.exports = Product = mongoose.model('product',ProductSchema)