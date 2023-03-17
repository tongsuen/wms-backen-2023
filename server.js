const express = require('express');
const morgan = require('morgan'); // logging


const connectDB = require('./config/db');
const path = require('path')
const app = express();
const http = require('http');

const { Server } = require("socket.io");

const fs = require('fs');
const logFile = path.join(__dirname, 'logs.log');

const serverHttp = http.createServer(app);

const io = new Server(serverHttp,  {
    cors: {
        origin: '*',
      }
  });
// const io = require("socket.io")(server, {
//     cors: {
//         origin: '*',
//       }
//   });
const cors = require('cors')
// Connect Database
connectDB();
// Init Middleware
app.use(express.json())
app.use(cors())
app.get('/', (req, res) => {
  res.send('wms server running...')
})
// Setup the logger middleware

//const accessLogStream = fs.createWriteStream(path.join(__dirname, 'logs.log'), { flags: 'a' });
// morgan.token('body', req => {
//     return JSON.stringify(req.body)
// })
// morgan.token("headers", function(req, res) {
//     return JSON.stringify(req.headers);
//   });
// app.use(morgan(':date ,:status ,:response-time :method :url :headers  :body', { stream: accessLogStream }));

//Define Upload files
app.use('/uploads', express.static('uploads'));

// Define Routes
app.use('/api/users',require('./routes/api/users'))
app.use('/api/auth',require('./routes/api/auth'))
app.use('/api/manage',require('./routes/api/manage'))
app.use('/api/chart',require('./routes/api/chart'))
app.use('/api/search',require('./routes/api/search'))
app.use('/api/admin',require('./routes/api/admin'))
app.use('/api/report',require('./routes/api/report'))
app.use('/api/mobile',require('./routes/api/mobile'))

// Serve static assets in production
if(process.env.NODE_ENV == 'production'){
    // Set static folder
    app.use(express.static('client/build'))
    app.get('*',(req,res)=>{
        res.sendFile(path.resolve(__dirname,'client','build','index.html'))
    })
}
io.on('connection', (socket) => {
    console.log("Socket connected: " + socket.id);
    socket.on('action', (action) => {
        //console.log('action')
      if(action.type === 'server/join'){
       // console.log('Got hello data!', action.data);
        //socket.emit('action', {type:'message', data:'good day!'});
        socket.join(action.data._id);
        console.log('join user')
        console.log(action.data._id)
      }
      else if(action.type === 'server/join_admin'){
         socket.join('admin');
         console.log('join admin')
       }
    });
});
app.set('socketio', io)

const PORT = process.env.PORT || 5000;

serverHttp.listen(PORT, ()=> console.log('server started on port ' + PORT));

// server.listen(3333, () => {
//     console.log('listening on *:3333');
    
// });



//Schedule
// const schedule = require('node-schedule')
// const rule = new schedule.RecurrenceRule();
// rule.dayOfWeek = [0, new schedule.Range(0, 6)];
// rule.hour = 23;
// rule.minute = 55;

// const job =  schedule.scheduleJob(rule,async function(){

//     const StocksHistory = require('./models/StocksHistory')
//     const Stocks = require('./models/Stocks')
//     const moment =  require('moment')

//     const current_day = moment()
//     await StocksHistory.deleteMany({day:current_day.format('D'),month:current_day.format('M'),year:current_day.format('YYYY')})

//     console.log(current_day);
//     const list = await Stocks.find({is_active:true});
//     for(const index in list){
//         const stock = list[index];

//         const item = new StocksHistory();
//         item.inventory = stock.inventory;
//         item.zone = stock.zone;
//         item.stock = stock;
//         item.current_amount = stock.current_amount;
//         item.user = stock.user;
//         item.name = stock.name;
//         if(stock.product_code)item.product_code = stock.product_code;
//         item.lot_number = stock.lot_number;
//         item.day = current_day.format('D');
//         item.month = current_day.format('M');
//         item.year = current_day.format('YYYY');
//         item.create_date = current_day;
//         await item.save();
//     }
//     const h_list = await StocksHistory.find();
//     console.log(h_list);
// });