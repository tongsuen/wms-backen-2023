const mongoose = require('mongoose');

const ZoneSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    main:{
        type:String,
    },
    running_number:{
        type:Number,
    },
    x:{
        type:Number,
    },
    y:{
        type:Number,
    },

    descriptions:{
        type:String,
    },
    is_avaliable:{
        type:Boolean,
        default:true
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

module.exports = Zone = mongoose.model('zone',ZoneSchema)