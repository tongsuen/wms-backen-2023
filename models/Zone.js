const mongoose = require('mongoose');

const ZoneSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,   
        index: true // Add an index to the name field
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
    location_x:{
        type:Number,
    },
    location_y:{
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