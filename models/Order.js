const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({

  
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
    list:[
        { 
            product:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'product',
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
            number_pallate:{
                type:Number,
                default:0
            },
            weight:{
                type:Number
            },
            unit:{
                type:String
            },
            sub_unit:{
                type:String
            },
            sub_amount:{
                type:Number,
                default:0
            },
            amount:{
                type:Number,
                default:0
            },
            mfg_date : {
                type : Date,
            },
            exp_date : {
                type : Date,
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
        type:String,
        enum: ['pending','accept', 'decline'],
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
    in_transport:{
        driver:{
            type:String,
        },
        car_code:{
            type:String,
        },
        name:{
            type:String
        }
    },
    out_transport:{
        driver:{
            type:String,
        },
        car_code:{
            type:String,
        },
        name:{
            type:String
        }
    },
    remark:{
        type:String,
    },
    import_date : {
        type : Date,
    },
    create_date : {
        type : Date,
        default : Date.now
    }
});

OrderSchema.index({name:'text',lot_number:'text',product_code:'text'});
module.exports = Order = mongoose.model('order',OrderSchema)