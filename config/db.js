const mongoose  = require("mongoose");
const config = require('config');

const db = config.get('mongoURI');

const connectDB = async () => {
    console.log(db)
    try {
        await mongoose.connect(db, {
            useNewUrlParser:true,
        });
        //console.log("MongoDB connected...")
    }catch(err){
        //console.log(err.message);
        // Exit process with failure
        process.exit(1);
    }
}
////    "mongoURI":"mongodb+srv://tongsuendev:Kib1BiPmIc4oK3nh@cluster0.knrftv5.mongodb.net/?retryWrites=true&w=majority",
module.exports = connectDB;