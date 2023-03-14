const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  
    stock:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'stocks',
    },
    detail:{
        type:String,
    },
    images:[
        {
            type:String
        }
    ],
    create_date : {
        type : Date,
        default : Date.now
    }
});
NoteSchema.index({detail:'text'});
module.exports = Note = mongoose.model('note',NoteSchema)