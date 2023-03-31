const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({

  
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
    list:[
        {
            name:{
                type:String,
            },
            lot_number:{
                    type:String,
            },
            product_code:{
                    type:String,
            },
            amount:{
                type:Number,
                default:0
            },
            stock:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'stocks',
            },
        }
    ],

    files:[
        {
            type:String
        }
    ],
    type:{
        type:Number,
        //1 = stock in, 2 = stock out,
    },
    status:{
        type:Number,
        default:1
    },

    from:{
            type:String,
    },

    to:{
        type:String,
    },

    driver:{
        type:String,
    },
    car_code:{
        type:String,
    },
    create_date : {
        type : Date,
        default : Date.now
    }
});

OrderSchema.index({name:'text',lot_number:'text',product_code:'text'});
module.exports = Order = mongoose.model('order',OrderSchema)