const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
    stock:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'stocks',
    },
    inventory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'inventory',
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
    ref_number:{
        type:String
    },
    create_by:{
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
    import_list:[{
        inventory:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'inventory',
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
        zone:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'zone',
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
InvoiceSchema.pre('save', async function (next) {
    try {
      if (!this.ref_number) {
        // Generate a new reference number if not provided

        const lastInvoice = await Invoice.findOne({}, {}, { sort: { 'create_date': -1 } });
        let newRefNumber;

        if (lastInvoice) {
          let lastRefNumber = lastInvoice.ref_number;
          if(!lastRefNumber) lastRefNumber = 'INV-0001'
          const lastNumber = parseInt(lastRefNumber.slice(-4), 10);
          newRefNumber = `INV-${(lastNumber + 1).toString().padStart(4, '0')}`;
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
InvoiceSchema.index({name:'text',lot_number:'text',product_code:'text'});
module.exports = Invoice = mongoose.model('invoice',InvoiceSchema)