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
    export_product_list:[{//for export product by user and admin assing stock again
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
        amount:{
            type:Number,
            default:0
        },
        sub_amount:{
            type:Number,
            default:0
        },
        unit:{
            type:String,
        },
        sub_unit:{
            type:String,
        },
    }],
    export_list:[{//for export list stock by admin
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
        sub_unit:{
            type:String,
        },
        amount:{
            type:Number,
            default:0
        },
        sub_amount:{
            type:Number,
            default:0
        },
        zone:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'zone',
        },
        number_pallate:{
            type:Number,
            default:1
        },
    }],
    import_list:[{//for import list inventory
        inventory:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'inventory',
        },
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
            default:1
        },
        zone:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'zone',
        },
        unit:{
            type:String,
        },
        sub_unit:{
            type:String,
        },
        amount:{
            type:Number,
            default:0
        },
        sub_amount:{
            type:Number,
            default:0
        }
    }],
    import_stock_list:[{//for import list inventory
        inventory:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'inventory',
        },
        stock:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'stock',
        },
        product:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'product',
        },
        zone:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'zone',
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
        sub_unit:{
            type:String,
        },
        amount:{
            type:Number,
            default:0
        },
        sub_amount:{
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
    sub_amount:{
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
        type:String,
        enum: ['pending','accept','decline','request','delete'],
        default:'pending'// 1 :in warehouse, 2 :pennding export , 3 :out of stock , -1 : remove by user,resuest is create by user
    },
    remark:{
        type:String,
    },
    from:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'location',
    },
    to:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'location',
    },
    order:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'order',
    },
    history:[
        {
            status:String,
            user:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'user',
            },
            create_date : {
                type : Date,
                default : Date.now()
            }
        }
    ],
    driver:{
            type:String
    },
    is_active:{
        type:Boolean,
        default:true
    },
    car_code:{
            type:String
    },
    start_date : {
        type : Date,
        default:Date.now()
    },
    
},{
    timestamps: {
        createdAt: 'create_date',
        updatedAt: 'update_date'
}
  });
InvoiceSchema.pre('save', async function (next) {
    try {
      if (!this.ref_number) {
        // Generate a new reference number if not provided
        const currentDate = new Date().toLocaleDateString('th-TH', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }).replace(/\//g, '');

        const lastInvoice = await Invoice.findOne({}, {}, { sort: { 'create_date': -1 } });
        let newRefNumber;

        if (lastInvoice) {
            let lastRefNumber = lastInvoice.ref_number;
            if(!lastRefNumber) lastRefNumber = `${currentDate}0001`
            const lastNumber = parseInt(lastRefNumber.slice(-4), 10);
            newRefNumber = `${currentDate}${(lastNumber + 1).toString().padStart(4, '0')}`;
        } else {
            newRefNumber = `${currentDate}0001`;;
        }
        this.ref_number = newRefNumber;
      }
      next();
    } catch (error) {
      next(error);
    }
});
InvoiceSchema.index({name:'text',lot_number:'text',product_code:'text',ref_number:'text'});
module.exports = Invoice = mongoose.model('invoice',InvoiceSchema)