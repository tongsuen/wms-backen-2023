const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'category',
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
  
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product',
    },
    amount:{
        type:Number,
    },
    current_amount:{
        type:Number,
    },
    weight:{
        type:Number,
    },
    number_pallate:{
        type:Number,
    },
    lot_number:{
        type:String,
        required:true,
    },
    product_code:{
        type:String,
    },

    total_sub_unit:{ // number of sub unit 
        type:Number,
        defaul:0
    },
    mfg_date : {
        type : Date,
    },
    exp_date : {
        type : Date,
    },
    images:[
        {
            type:String
        }
    ],
    remark:{
        type:String,
    },
    
    is_in_stock:{
        type:Boolean,
        default:false
    },
    is_active:{
        type:Boolean,
        default:true
    },
    import_date : {
        type : Date,
    },
    create_date : {
        type : Date,
        default : Date.now
    }
});
InventorySchema.index({name:'text',lot_number:'text',product_code:'text',unit:'text',image:'text'});
module.exports = Inventory = mongoose.model('inventory',InventorySchema)