const mongoose = require('mongoose');

const PalletSchema = new mongoose.Schema({
    name:{
        type:String,
    },
    width:{
        type:Number
    },
    long:{
        type:Number
    },
    height:{
        type:Number
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
module.exports = Pallet = mongoose.model('pallet',PalletSchema)