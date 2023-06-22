const mongoose = require('mongoose');

const StockTaskSchema = new mongoose.Schema({
  
    type:{
        type:String,
        enum: ['out','move','combine', 'pickup'],
        default:'out'// 1 :in warehouse, 2 :pennding export , 3 :out of stock , -1 : remove by user
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