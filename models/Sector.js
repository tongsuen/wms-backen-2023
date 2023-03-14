const mongoose = require('mongoose');

const SectorSchema = new mongoose.Schema({
    zones:[{
        zone:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'user',
        },
    }], 
    sector_name:{
        type:String
    },
    sector_number:{
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

module.exports = Sector = mongoose.model('sector',SectorSchema)