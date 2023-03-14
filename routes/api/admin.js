const express = require('express')
const router = express.Router();
const {check, validationResult} = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('config')
const auth =require('../../middleware/auth')
const moment =  require('moment')

const {sendMessage} = require('../../push_noti')

const User = require('../../models/User')
const Alert = require('../../models/Alert')
const Inventory = require('../../models/Inventory')
const Move = require('../../models/Move')
const Stocks = require('../../models/Stocks')
const StocksHistory = require('../../models/StocksHistory')
const Invoice = require('../../models/Invoices')
const Zone = require('../../models/Zone')
const Inbox = require('../../models/Inbox') 
const History = require('../../models/History') 

const send_noti = async (type = 1,users_id =[],title='',msg='') => {
    if(type == 1){
        //send push to all admin
        const users = await User.find({"expo_token":{$exists:true},admin:true})
        console.log(users)
        sendMessage(users,title,msg)
    }
    if(type == 2){
        //send push to all admin
        const users = await User.find({"expo_token":{$exists:true},admin:false})
        console.log(users)
        sendMessage(users,title,msg)
    }
    if(type == 3){
        const users = await User.find({"expo_token":{$exists:true},"_id" : { $in : users_id }})
        console.log(users)
        sendMessage(users,title,msg)
    }
 
}
router.post('/list_admin', auth,async (req,res)=> {
    try {
    
        const list = await User.find({admin:true})
   
        res.json(list)

    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/list_user', auth,async (req,res)=> {
    try {
    
        const list = await User.find({admin:false})
   
        res.json(list)

    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/list_stock_out_pending', auth,async (req,res)=> {
    const {user,page = 1,limit = 10} = req.body;
    try {
        var query ={
            type:2,
            status:1
        };
        console.log(query)
        const list = await Invoice.find(query).populate('inventory').populate('stock').skip((page - 1) * limit).limit(limit).sort({create_date:-1});
        const total = await Invoice.countDocuments(query);
        res.json({
            page:page,
            list:list,
            total:total
        })

    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/accept_invoice', auth,async (req,res)=> {
    const {invoice_id,action} = req.body;
    try {
     
        const stock_out = await Invoice.findOne({_id:invoice_id})
        
        const by_user = await User.findById(req.user.id)
        if(action == 1)// accept
        {
            stock_out.status = 2;
            send_noti(1,[],'นำสินค้าออกสำเร็จ','สินค้าของคุณได้รับการอนุมัติให้ออกจากคลังสินค้าแล้ว');
            const alert = new Alert({
                invoice:stock_out._id,
                type:5,
                by_user:by_user,
                user:stock_out.user,
                subject:'นำสินค้าออกสำเร็จ',
                detail:'สินค้าของคุณได้รับการอนุมัติให้ออกจากคลังสินค้าแล้ว'
            })
            await alert.save()
            console.log(alert)
            const io = req.app.get('socketio');
            io.to(alert.user.toString()).emit('action', {type:'new_alert',data:alert});
        }
        else if(action == 2)//decline
        {
            stock_out.status = 0;
            const stock = await Stocks.findById(stock_out.stock);
            stock.current_amount = stock.current_amount + stock_out.amount;
            stock.is_active = true;
            stock.status = 1;

            await stock.save()
            send_noti(1,[],'นำสินค้าออกไม่สำเร็จ','ไม่สามารถเอาสินค้าออกจากคลังสินค้าได้ โปรดติดต่อเจ้าหน้าที่');
            const alert = new Alert({
                invoice:stock_out._id,
                type:6,
                by_user:by_user,
                user:stock_out.user,
                subject:'นำสินค้าออกไม่สำเร็จ',
                detail:'ไม่สามารถเอาสินค้าออกจากคลังสินค้าได้ โปรดติดต่อเจ้าหน้าที่'
            })
            console.log(alert)
            await alert.save()
            const io = req.app.get('socketio');
            io.to(alert.user.toString()).emit('action', {type:'new_alert',data:alert});
        }
        await stock_out.save();
        res.json(stock_out)

    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/stock_active', auth,async (req,res)=> {
    const { stock_id, is_active =false } = req.body;
    try {
    
        const stock = await Stocks.findById(stock_id)
        stock.is_active = is_active
        await stock.save()
        res.json(stock)

    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/list_history', auth,async (req,res)=> {
    const { stock_id, is_active =false } = req.body;
    try {

         const fff = await History.find().sort({create_date:-1})
         console.log(fff)
        res.json(fff)

    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/move_stock', auth, async (req, res) => {
    const { stock, zone, amount } = req.body;
  
    try {
      const [stk, z, byUser] = await Promise.all([
        Stocks.findOne({ _id: stock }),
        Zone.findOne({ _id: zone }),
        User.findById(req.user.id),
      ]);
  
      if (stk.current_amount < amount) {
        return res
          .status(400)
          .json({ message: 'Your number is more than the existing inventory' });
      }
      console.log(stk)

      const newStock = new Stocks()
      newStock.moveFrom = {
            zone:z,
            stock:stk,
            old_amount:stk.current_amount,
            amount:amount
      }
      newStock.current_amount = amount
      newStock.status = 1
      newStock.name = stk.name
      newStock.lot_number = stk.lot_number
      newStock.product_code = stk.product_code
      newStock.inventory = stk.inventory
      newStock.user = stk.user
      newStock.zone = z
      if (amount === stk.current_amount) {
        stk.current_amount = 0;
        stk.is_active = false;
      } else {
        stk.current_amount -= amount;
      }
  
      const flowBalance = {
        balance: stk.current_amount,
        bring_forward: 0,
        receive_amount: amount,
        send_amount: 0,
      };
  
      const moveDoc = new Move({
        from: {
          stock: stk,
          zone: stk.zone,
          amount: stk.current_amount,
        },
        to: {
          stock: newStock,
          zone: newStock.zone,
          amount: newStock.current_amount,
        },
        flow_balance: flowBalance,
        user: byUser,
      });
      console.log(newStock)

      await Promise.all([stk.save(), newStock.save(), moveDoc.save()]);
  
      res.json(newStock);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
  

module.exports = router; 
