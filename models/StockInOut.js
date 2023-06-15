const mongoose = require('mongoose');

const StocksInOutSchema = new mongoose.Schema({

    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product',
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
    invoice:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'invoice',
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
    avaliable:{
        amount:{
            type:Number,
            default:0
        },
        sub_amount:{
            type:Number
        }
    },
    incoming:{
        amount:{
            type:Number,
            default:0
        },
        sub_amount:{
            type:Number
        }
    },
    outgoing:{
        amount:{
            type:Number,
            default:0
        },
        sub_amount:{
            type:Number
        }
    },
    type:{
        type:Number,
        default:1
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

StocksInOutSchema.index({name:'text',lot_number:'text',product_code:'text',note:'text'});
module.exports = StocksInOut = mongoose.model('stocksInOut',StocksInOutSchema)