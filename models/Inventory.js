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
    amount:{
        type:Number,
    },
    current_amount:{
        type:Number,
    },
    weight:{
        type:Number,
    },
    lot_number:{
        type:String,
        required:true,
    },
    product_code:{
        type:String,
    },
    unit:{
        type:String,
        required:true,
    },
    sub_unit:{
        type:String,
        required:true,
    },
    number_of_unit:{ // number of main unit ex: 10 box
        type:Number,
    },
    number_per_unit:{ // number of item in main unit ex: 10 bottle in 1 box
        type:Number,
    },
    mfg_date : {
        type : String,
    },
    exp_date : {
        type : String,
    },
    images:[
        {
            type:String
        }
    ],
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