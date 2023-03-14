const mongoose = require('mongoose');

const StocksSchema = new mongoose.Schema({

    inventory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'inventory',
    },
    zone:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'zone',
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
    notes:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'note',
    }],
    moveFrom:{
        zone:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'zone',
        },
        stock:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'stock',
        },
        old_amount:{
            type:Number
        },
        amount:{
            type:Number
        }
    },

    name:{
            type:String,
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

    prepare_out:{
        type:Number,
        default:0
    },
    status:{
        type:Number,
        default:1// 1 :in warehouse, 2 :pennding export , 3 :out of stock , -1 : remove by user
    },
    note:{
        type:String,
    },
    file:{
        type:String,
    },
    is_active:{
        type:Boolean,
        default:true
    },
    update_date : {
        type : Date,
    },
    create_date : {
        type : Date,
        default : Date.now
    }
});

StocksSchema.index({name:'text',lot_number:'text',product_code:'text',note:'text'});
module.exports = Stocks = mongoose.model('stocks',StocksSchema)