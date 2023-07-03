const mongoose = require('mongoose');

const StockTaskSchema = new mongoose.Schema({
  
    type:{
        type:String,
        enum: ['in','out','move','movein','moveout','combineout','combinein', 'pickup', 'add', 'remove'],
        default:'out'
    },
    amount:{
        type:Number,
    },
    sub_amount:{
        type:Number,
    },
    stock:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'stocks',
    },
    invoice:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'invoice',
    },
    combine:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'combine',
    },
    move:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'move',
    },
    move_props:{
        from_zone:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'zone',
        },
        from_zone_name:{
            type:String
        },
        to_zone:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'zone',
        },
        to_zone_name:{
            type:String
        },
       
    },
    combine_props:{
       
        to_zone:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'zone',
        },
        to_zone_name:{
            type:String
        },
    },
    stock_status:{
        type:String
    },
    remark:{
        type:String
    },
    start_date : {
        type : Date,
        default : Date.now
    },
    create_date : {
        type : Date,
        default : Date.now
    }
});
module.exports = StockTask = mongoose.model('stockTask',StockTaskSchema)