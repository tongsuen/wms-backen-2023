const mongoose = require('mongoose');

const TransportSchema = new mongoose.Schema({
  
    name:{
        type:String,
    },
    driver:{
        type:String,
    },
    car_code:{
        type:String,
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
    create_date : {
        type : Date,
        default : Date.now
    }
});
TransportSchema.index({name:'text',car_code:'text',driver:'text'});
module.exports = Transport = mongoose.model('transport',TransportSchema)