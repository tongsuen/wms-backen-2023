const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({

    remark:{
        type:String
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

module.exports = History = mongoose.model('history',HistorySchema)