const mongoose = require('mongoose');

const StocksHistorySchema = new mongoose.Schema({

    inventory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'inventory',
    },
    stock:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'stocks',
    },
    zone:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'zone',
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
    history:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'history',
    },
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product',
    },
    day:{
        type:Number
    },
    month:{
        type:Number,
    },
    year:{
        type:Number,
    },
    name:{
        type:String,
        required:true,
    },
    lot_number:{
        type:String,
    },
    product_code:{
        type:String,
    },

    current_amount:{
        type:Number,
        default:0
    },
    is_active:{
        type:Boolean,
        default:true
    },
    create_date : {
        type : Date,
        default : Date.now
    },
});
StocksHistorySchema.index({name:'text',lot_number:'text',product_code:'text'});

module.exports = StocksHistory = mongoose.model('stocks_history',StocksHistorySchema)