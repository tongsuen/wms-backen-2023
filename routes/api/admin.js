const express = require('express')
const router = express.Router();
const {check, validationResult} = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('config')
const auth =require('../../middleware/auth')
const moment =  require('moment')

const {sendMessage} = require('../../push_noti')

const {upload_files} = require('../../s3')
const User = require('../../models/User')
const Alert = require('../../models/Alert')
const Inventory = require('../../models/Inventory')
const Move = require('../../models/Move')
const Stocks = require('../../models/Stocks')
const StocksHistory = require('../../models/StocksHistory')
const Invoice = require('../../models/Invoices')
const Zone = require('../../models/Zone')
const Combine = require('../../models/Combine') 
const History = require('../../models/History') 
const Files = require('../../models/Files') 

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
router.post('/remove_inventory', auth,async (req,res)=> {
    try {
        const {inv_id} = req.body
        const inv = await Inventory.findById(inv_id)
        inv.is_active = false
        await inv.save()
        res.json(inv)

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
       
            if(stock_out.stock){
                const stock = await Stocks.findById(stock_out.stock);
                stock.current_amount = stock.current_amount + stock_out.amount;
                stock.is_active = true;
                stock.status = 1;
                await stock.save()
            }
            else {
                for (let i = 0; i < stock_out.list.length; i++) {
                    const stk=  stock_out.list[i]
                    console.log(stk)
                    const stock = await Stocks.findById(stk.stock);
                 
                    stock.current_amount = stock.current_amount + stk.amount;
        
                    stock.is_active = true;
                    stock.status = 1;
                    await stock.save()
                }
            }
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
router.post('/list_move_stock', auth,async (req,res)=> {
    const { page = 1, limit =10 } = req.body;
    try {

        const list = await Move.find({}).populate('user').populate('from.stock').populate('from.zone').populate('to.stock').populate('to.zone').skip((page - 1) * limit).limit(limit).sort({create_date:-1});
        const total = await Move.countDocuments({});
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
      if (amount === stk.current_amount) {
        // stk.current_amount = 0;
        // stk.is_active = false;
        
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
                stock: stk,
                zone: z,
                amount: stk.current_amount,
                },
                flow_balance: flowBalance,
                user: byUser,
            });

            stk.zone = z
            const moveFrom = {
                zone:z,
                stock:stk,
                old_amount:stk.current_amount,
                amount:amount
            }

            stk.moveFrom =  [moveFrom,...stk.moveFrom]
            await Promise.all([stk.save(), moveDoc.save()]);
            res.json(stk);
      } else {

            stk.current_amount -= amount;

            const newStock = new Stocks()
            const moveFrom = {
                zone:z,
                stock:stk,
                old_amount:stk.current_amount,
                amount:amount
            }
            newStock.moveFrom = [moveFrom]
            newStock.current_amount = amount
            newStock.status = 1

            newStock.name = stk.name
            newStock.lot_number = stk.lot_number
            newStock.product_code = stk.product_code

            newStock.inventory = stk.inventory
            newStock.unit = stk.unit
            newStock.user = stk.user
            newStock.zone = z
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
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
});
router.post('/combine_stock', auth, async (req, res) => {
    const { stocks, zone, byUser } = req.body;
  
    try {
      const stockIds = stocks.map((stk) => stk.stock_id);
      const stocksInfo = await Stocks.find({ _id: { $in: stockIds } });
      const totalAmount = stocks.reduce((total, stk) => total + stk.amount, 0);
  
      for (const stockInfo of stocksInfo) {
        const stk = stocks.find((s) => s.stock_id === stockInfo._id.toString());
        if (stockInfo.current_amount - stk.amount === 0) {
          stockInfo.current_amount = 0;
          stockInfo.is_active = false;
        } else if (stockInfo.current_amount - stk.amount >= 0) {
          stockInfo.current_amount = stockInfo.current_amount - stk.amount;
        } else {
          throw new Error('Invalid amount');
        }
        await stockInfo.save();
      }
      
      const combinedStock = new Stocks({
        zone,
        user:  stocksInfo[0].user,
        name: stocksInfo[0].name,
        lot_number: stocksInfo[0].lot_number,
        product_code: stocksInfo[0].product_code,
        inventory: stocksInfo[0].inventory,
        group_unit: stocksInfo[0].group_unit,
        unit: stocksInfo[0].unit,
        current_amount: totalAmount,
      });
      await combinedStock.save();
  
      const combine = new Combine({
        from: stocksInfo,
        to: {
          stock: combinedStock,
          zone: combinedStock.zone,
          amount: combinedStock.current_amount,
        },
        flow_balance: {
          balance: combinedStock.current_amount,
          bring_forward: 0,
          receive_amount: totalAmount,
          send_amount: 0,
        },
        user: byUser,
      });
      await combine.save();
      res.json(combinedStock);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
});
router.post('/create_file', [auth,upload_files.array('files')], async (req, res) => {
    const { name } = req.body;
  
    try {
        const file_obj = new Files({name:name,user:req.user.id})
        await Promise.all(req.files.map(async (file) => {
            file_obj.files.push(file.location)
        }))
        await file_obj.save()
        res.json(file_obj);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});
router.post('/delete_file',auth, async (req, res) => {
    const { file_id } = req.body;
  
    try {
        const file  = await Files.findById(file_id)
        file.is_active = false
        await file.save()
        res.json(file);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});
router.post('/list_file', auth, async (req, res) => {
    const { page=1,limit=10,start_date,end_date,is_active=true,search } = req.body;
  
    try {
        console.log(req.body)
        let query = {is_active:is_active}
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { name: { $regex: searchRegex } },
            ];
        }

        if(end_date && start_date) query.create_date = { $gte: start_date, $lte: end_date}
        const list = await Files.find(query).populate('user').skip((page - 1) * limit).limit(limit).sort({create_date:-1});
        const total = await Files.countDocuments({is_active:true});
        console.log(total)
        res.json({
            page:page,
            list:list,
            total:total
        })
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});
router.get('/delete_data', async (req, res) => {
    const { stocks, zone, byUser } = req.body;
  
    try {
      Invoice.deleteMany({type:1})
      .then(() => console.log('All invoice removed'))
      .catch((err) => console.error(err));

    //   Stocks.deleteMany({})
    //   .then(() => console.log('All data removed'))
    //   .catch((err) => console.error(err));

      res.json({});
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
});
router.get('/create_data', async (req, res) => {
    const { stocks, zone, byUser } = req.body;
    const location = ['A Warehouse','B Warehouse','C Warehouse','D Warehouse']
    const transport = ['A Transport','B Transport','C Transport','D Transport']
    const startYear = 2022;
    const endYear = 2023;
    const startMonth = 0; // January
    const endMonth = 11; // December

    try {

        for (let year = startYear; year <= endYear; year++) {
            for (let month = startMonth; month <= endMonth; month++) {

                const randomStocks = await Stocks.aggregate([{ $sample: { size: Math.floor(Math.random() * 5) + 1 } }]);
                const list = randomStocks.map(stock => ({
                  stock: stock._id,
                  name: stock.name,
                  lot_number: stock.lot_number,
                  product_code: stock.product_code,
                  amount: Math.floor(Math.random() * stock.current_amount) + 1
                }));
                const count = await User.countDocuments();
                const rand = Math.floor(Math.random() * count);
                const user = await User.findOne().skip(rand);
        
                console.log(list)
                const invoice = new Invoice({
                  user: user,
                  list,
                  type: 1,
                  amount: list.reduce((total, item) => total + (item.amount ), 0),
                  flow_balance: {
                    bring_forward: Math.floor(Math.random() * 1000),
                    receive_amount: Math.floor(Math.random() * 1000),
                    send_amount: Math.floor(Math.random() * 1000),
                    balance: Math.floor(Math.random() * 1000)
                  },
                  status: 2,
                  from: location[Math.floor(Math.random()*location.length)+1],
                  to: location[Math.floor(Math.random()*location.length)+1],
                  tranport: transport[Math.floor(Math.random()*location.length)+1]
                });
                const yearStr = year.toString();
                const monthStr = (month + 1).toString().padStart(2, '0');
                const invoiceDate = new Date(`${yearStr}-${monthStr}-01`);
                invoice.create_date = invoiceDate;

                const result = await invoice.save();
                console.log(`Invoice ${result._id} created with list:`, list);
            }
        }
       
       
        res.json({});
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
});

module.exports = router; 
