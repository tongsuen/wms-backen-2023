const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({

    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },

    list:[{
        stock:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'stocks',
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
        unit:{
            type:String,
        },
        amount:{
            type:Number,
            default:0
        }
    }],
    zone_out_name:{
        type:String,
    },  
    zone_in_name:{
        type:String,
    }, 
    files:[
        {
            type:String
        }
    ],
    
    type:{
        type:Number,
        //1 = stock in, 2 = stock out,
    },
    amount:{
        type:Number,
        default:0
    },
    flow_balance:{
        bring_forward:{
            type:Number,
            default:0
        },
        receive_amount:{
            type:Number,
            default:0
        }, 
        send_amount:{
            type:Number,
            default:0
        },
        balance:{
            type:Number,
            default:0
        },
    },
    status:{
        type:Number,
        default:1
    },
    remark:{
        type:String,
},
    from:{
            type:String,
    },

    to:{
        type:String,
    },

    tranport:{
        type:String,
    },
    create_date : {
        type : Date,
        default : Date.now
    }
});

InvoiceSchema.index({name:'text',lot_number:'text',product_code:'text'});
module.exports = Invoice = mongoose.model('invoice',InvoiceSchema)