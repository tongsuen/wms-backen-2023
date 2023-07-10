const mongoose = require('mongoose');

const MoveSchema = new mongoose.Schema({

    from:{
        stock:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'stocks',
        },
        zone:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'zone',
        },
        amount:{
           type:Number
        },
        sub_amount:{
            type:Number
        }
    },
    to:{
        stock:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'stocks',
        },
        zone:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'zone',
        },
        amount:{
           type:Number
        },
        sub_amount:{
            type:Number
        }
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
    remark:{
        type:String
    },
    files:[
        {
            type:String
        }
    ],
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
    create_date : {
        type : Date,
        default : Date.now
    }
});

MoveSchema.index({name:'text',lot_number:'text',product_code:'text'});
module.exports = Move = mongoose.model('move',MoveSchema)