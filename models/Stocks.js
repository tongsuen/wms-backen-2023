const mongoose = require('mongoose');

const StocksSchema = new mongoose.Schema({

    inventory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'inventory',
    },
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product',
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
    moveFrom:[{
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
        },
        create_date:{
            type:Date,
            default : Date.now
        }
    }],
    exportFrom:[{
        invoice:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'invoice',
        },
        sub_amount:{
            type:Number
        },
        amount:{
            type:Number
        },
        create_date:{
            type:Date,
            default : Date.now
        }
    }],
    combineFrom:[{
     
        stock:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'stock',
        },
        old_amount:{
            type:Number
        },
        amount:{
            type:Number
        },
        create_date:{
            type:Date,
            default : Date.now
        }
    }],

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
    current_sub_amount:{
        type:Number,
        default:0
    },
    prepare_out:{
        type:Number,
        default:0
    },
    prepare_out_sub_amount:{
        type:Number,
        default:0
    },
    status:{
        type:String,
        enum: ['warehouse','combine','pending', 'out','removed','expire'],
        default:'warehouse'// 1 :in warehouse, 2 :pennding export , 3 :out of stock , -1 : remove by user
    },
    note:{
        type:String,
    },
    file:{
        type:String,
    },
    is_sub:{
        type:Boolean,
        defaul:false
    },
    is_active:{
        type:Boolean,
        default:true
    },
    pallet:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'pallet',
    },
 
    live_date : {//time stock put in location in warehouse
        type : Date,
    },
    out_date : {//time stock out location in warehouse
        type : Date,
    },
    update_date : {
        type : Date,
    },
    create_date : {
        type : Date,
        default : Date.now
    },
    tags:[
        {
            type:String
        }
    ]
});

StocksSchema.pre('save', async function (next) {
    try {
      if (!this.ref_number) {
        // Generate a new reference number if not provided

        const lastInvoice = await Invoice.findOne({}, {}, { sort: { 'create_date': -1 } });
        let newRefNumber;

        if (lastInvoice) {
          let lastRefNumber = lastInvoice.ref_number;
          if(!lastRefNumber) lastRefNumber = '0001'
          const lastNumber = parseInt(lastRefNumber.slice(-4), 10);
          newRefNumber = `STK-${(lastNumber + 1).toString().padStart(4, '0')}`;
        } else {
          newRefNumber = 'INV-0001';
        }
        this.ref_number = newRefNumber;
      }
      next();
    } catch (error) {
      next(error);
    }
});
   
StocksSchema.index({name:'text',lot_number:'text',product_code:'text',note:'text',zone:1,inventory:1,product:1});
module.exports = Stocks = mongoose.model('stocks',StocksSchema)