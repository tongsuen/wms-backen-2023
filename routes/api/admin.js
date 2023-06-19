const express = require('express')
const router = express.Router();
const {check, validationResult} = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('config')
const auth =require('../../middleware/auth')
const auth_admin =require('../../middleware/auth_admin')
const moment =  require('moment')

const {sendMessage} = require('../../push_noti')
const { upload_inboxs, upload_invoices, upload_notes, upload_inventories, delete_obj } = require('../../s3')

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
const {calculate_amount_by_sub_amount} = require('../../utils/lib')
const send_noti = async (type = 1,users_id =[],title='',msg='') => {
    if(type == 1){
        //send push to all admin
        const users = await User.find({"expo_token":{$exists:true},admin:true})
        //console.log(users)
        sendMessage(users,title,msg)
    }
    if(type == 2){
        //send push to all admin
        const users = await User.find({"expo_token":{$exists:true},admin:false})
        //console.log(users)
        sendMessage(users,title,msg)
    }
    if(type == 3){
        const users = await User.find({"expo_token":{$exists:true},"_id" : { $in : users_id }})
        //console.log(users)
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
router.post('/update_request_invoice', auth,async (req,res)=> {
    try {
        const {invoice_id,list} = req.body

        for (let i = 0; i < list.length; i++) {
            const stk_info = list[i];
           
            const amount = stk_info.amount
            const sub_amount = stk_info.sub_amount

            const stock = await Stocks.findById(stk_info.stock).populate('product')
           
            stock.prepare_out_sub_amount = stock.prepare_out_sub_amount + sub_amount
            stock.prepare_out = stock.prepare_out + amount
            await stock.save()
        }

        const invoice = await Invoice.findById(invoice_id)
        invoice.export_list = list

        invoice.status='pending'
        await invoice.save()
        res.json(invoice)

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
        //console.log(query)
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
        //console.log(req.body)
        const stock_out = await Invoice.findOne({_id:invoice_id})
        
        const by_user = await User.findById(req.user.id)
        if(action == 1)// accept
        {
            stock_out.status = 'accept'; // accept invoice

            for (let i = 0; i < stock_out.export_list.length; i++) {
                const stkInfo=  stock_out.export_list[i]
                //console.log(stkInfo)
                const stock = await Stocks.findById(stkInfo.stock).populate('product');
              
                if(stock.product.sub_unit){

                    stock.exportFrom = [{
                        invoice:stock_out,
                        amount : stkInfo.amount,
                        sub_amount :stkInfo.sub_amount ,
                 
                    },...stock.exportFrom]
                    stock.current_sub_amount =  stock.current_sub_amount - stkInfo.sub_amount
                    if(stock.current_sub_amount === 0){
                        stock.current_amount = 0
                        stock.prepare_out = 0
                        stock.prepare_out_sub_amount = 0
                        stock.status = 'out'
                    }
                    else{
                        stock.current_amount = calculate_amount_by_sub_amount(stock.current_sub_amount,stock.product.item_per_unit)
                        stock.prepare_out_sub_amount = stock.prepare_out_sub_amount - stkInfo.sub_amount
                        stock.prepare_out = calculate_amount_by_sub_amount(stock.prepare_out_sub_amount,stock.product.item_per_unit)
                    }
                }
                else{
                    stock.exportFrom = [{
                        invoice:stock_out,
                        amount : stkInfo.amount,
                 
                    },...stock.exportFrom]
                    stock.current_amount =  stock.current_amount - stkInfo.amount
                    stock.prepare_out =  stock.prepare_out - stkInfo.amount
                    
                    if(stock.current_amount === 0){
                        stock.current_amount = 0
                        stock.prepare_out = 0
                        stock.prepare_out_sub_amount = 0
                        stock.status = 'out'
                    }
                   
                }
                

                console.log(stock)
                await stock.save()
            }
            stock_out.history = [
                {
                    status:'accept',
                    user:req.user.id,
                },
                ...stock_out.history,
    
            ]
            send_noti(1,[],'นำสินค้าออกสำเร็จ','สินค้าของคุณได้รับการอนุมัติให้ออกจากคลังสินค้าแล้ว');
            const alert = new Notification({
                invoice:stock_out._id,
                type:'export',
                by_user:by_user,
                user:stock_out.user,
                title:'นำสินค้าออกสำเร็จ',
                detail:'สินค้าของคุณได้รับการอนุมัติให้ออกจากคลังสินค้าแล้ว'
            })
            await alert.save()
            //console.log(alert)
            const io = req.app.get('socketio');
            io.to(alert.user.toString()).emit('action', {type:'new_alert',data:alert});
        }
        else if(action == 2)//decline
        {
            stock_out.status = 'decline';
       
           
            for (let i = 0; i < stock_out.export_list.length; i++) {
                    const stk=  stock_out.export_list[i]

                    const stock = await Stocks.findById(stk.stock).populate('product');
                    if(stock.product.sub_unit){
                        stock.prepare_out_sub_amount = stock.prepare_out  - stk.sub_amount
                        stock.prepare_out = calculate_amount_by_sub_amount(stock.prepare_out_sub_amount,stock.product.item_per_unit)
                    }
                    else{
                        stock.prepare_out =  stock.prepare_out  - stk.amount
                    }
                    await stock.save()
            }
            

            stock_out.history = [
                {
                    status:'decline',
                    user:req.user.id,
                },
                ...stock_out.history,
    
            ]
            send_noti(1,[],'นำสินค้าออกไม่สำเร็จ','ไม่สามารถเอาสินค้าออกจากคลังสินค้าได้ โปรดติดต่อเจ้าหน้าที่');
            if(by_user.admin){
                const alert = new Notification({
                    invoice:stock_out._id,
                    type:'export',
                    by_user:by_user,
                    user:stock_out.user,
                    title:'นำสินค้าออกไม่สำเร็จ',
                    detail:'ไม่สามารถเอาสินค้าออกจากคลังสินค้าได้ โปรดติดต่อเจ้าหน้าที่'
                })
                //console.log(alert)
                await alert.save()
                const io = req.app.get('socketio');
                io.to(alert.user.toString()).emit('action', {type:'new_alert',data:alert});
            }
            else{
                const alert = new AdminNotification({
                    invoice:stock_out._id,
                    type:'export',
                    by_user:by_user,
                    user:stock_out.user,
                    title:'ลูกค้ายกเลิกคำร้อง',
                    detail:'ทำการยกเลิกคำร้อง'
                })
                //console.log(alert)
                await alert.save()
                const io = req.app.get('socketio');
                io.to('admin').emit('action', {type:'new_alert',data:alert});
            }
        }
        await stock_out.save();
        res.json(stock_out)

    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/update_invoice', [auth,upload_invoices.array('files')],async (req,res)=> {
    try {
        console.log(req.body)
        var query = req.body;

        let inv = await Invoice.findById(query._id)
        if(!inv)
            return res
            .status(400)
            .json({ message: 'Cannot find invoice' });
        if (query.old_files) {
            let difference = inv.files.filter(x => !query.old_files.includes(x))
            for (let i = 0; i < difference.length; i++) {
                const old = difference[i];
                delete_obj(old)
            }
            inv.files = query.old_files
            inv = await inv.save()
        }
        else {
            for (let i = 0; i < inv.files.length; i++) {
                const old = inv.files[i];
                delete_obj(old)
            }
            inv.files = []
            inv = await inv.save()
        }
        if (req.files) {
            var array = inv.files
            await Promise.all(req.files.map(async (file) => {
                array.push(file.location)
            }))
            query.files = array;
        }
        let doc = await Invoice.findOneAndUpdate({_id:req.body._id}, query);

        await doc.save()
        res.json(doc)

    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/stock_active', auth,async (req,res)=> {
    const { stock_id, is_active =false } = req.body;
    try {
    
        const stock = await Stocks.findById(stock_id).populate('product')
        stock.is_active = is_active
        await stock.save()
        res.json(stock)

    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/autocomplete_product',auth_admin,async (req,res)=> {
    const {keyword,user} = req.body;
    try {
        let query = {
            is_active:true
        }
        if(user){
            query.user = user
        }
        if(keyword){
            query.name = { 
                "$regex":keyword,
                '$options' : 'i' 
            }
        }

        const list_inv = await Product.find(query)
        
        return res.json(list_inv)
    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/list_history', auth,async (req,res)=> {
    const { stock_id, is_active =false } = req.body;
    try {

         const fff = await History.find().sort({create_date:-1})
         //console.log(fff)
        res.json(fff)

    }catch(err){
        //console.log(err.message);
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
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/move_stock', auth, async (req, res) => {
    const { stock, zone, amount,sub_amount } = req.body;
  
    try {
      const [stk, z, byUser] = await Promise.all([
        Stocks.findOne({ _id: stock }).populate('product'),
        Zone.findOne({ _id: zone }),
        User.findById(req.user.id),
      ]);
  
      if (stk.current_amount < amount || stk.current_sub_amount < sub_amount) {
        return res
          .status(400)
          .json({ message: 'Your number is more than the existing inventory' });
      }
      //console.log(stk)
      if (amount === stk.current_amount && sub_amount === stk.current_sub_amount) {
    
            const moveDoc = new Move({
                from: {
                stock: stk,
                zone: stk.zone,
                amount: stk.current_amount,
                sub_amount: stk.current_sub_amount,
                },
                to: {
                stock: stk,
                zone: z,
                amount: stk.current_amount,
                sub_amount: stk.current_sub_amount,
                },
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
            console.log(stk)
            stk.current_amount -= amount;
            if(stk.product.sub_unit) stk.current_sub_amount -= sub_amount;
            if(stk.current_amount === 0) stk.current_amount = 1

            const newStock = new Stocks()
            const moveFrom = {
                zone:z,
                stock:stk,
                old_amount:stk.current_amount,
                amount:amount,
                sub_amount:sub_amount
            }
            newStock.moveFrom = [moveFrom]
            newStock.current_amount = amount

            if(stk.product.sub_unit){

                newStock.sub_unit = stk.product.sub_unit
                newStock.current_sub_amount = sub_amount
                newStock.is_sub = true

            } 
            
            newStock.status = 'warehouse'

            newStock.name = stk.product.name
            newStock.lot_number = stk.lot_number
            newStock.product_code = stk.product_code

            newStock.inventory = stk.inventory
            newStock.product = stk.product
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
                    sub_amount: stk.current_sub_amount,
                },
                to: {
                    stock: newStock,
                    zone: newStock.zone,
                    amount: newStock.current_amount,
                    sub_amount: newStock.current_sub_amount,
                },
                flow_balance: flowBalance,
                user: byUser,
            });
            console.log(newStock)
            console.log(stk)
            await Promise.all([stk.save(), newStock.save(), moveDoc.save()]);
            res.json(newStock);
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
});
router.post('/combine_stock', auth, async (req, res) => {
    const { list, zone,remark } = req.body;
  
    try {
        //console.log(req.body)
      const stockIds = list.map((stk) => stk.stock);
      const stocksInfo = await Stocks.find({ _id: { $in: stockIds } }).populate('product');
      const totalAmount = list.reduce((total, stk) => total + stk.amount, 0);
      const totalSubAmount = list.reduce((total, stk) => total + stk.sub_amount, 0);

      for (const stockInfo of stocksInfo) {
 
        const stk = list.find((s) => s.stock === stockInfo._id.toString());
        if(stockInfo.product.sub_unit){
           
            stockInfo.current_sub_amount = stockInfo.current_sub_amount - stk.sub_amount
            stockInfo.current_amount = calculate_amount_by_sub_amount(stockInfo.current_sub_amount,stockInfo.product.item_per_unit)
            if (stockInfo.current_sub_amount === 0 ) {
                stockInfo.current_amount = 0
                stockInfo.status = 'combine';
    
            }
        }
        else{
            stockInfo.current_amount =stockInfo.current_amount - stk.amount
            if (stockInfo.current_amount === 0 ) {
                stockInfo.status = 'combine';
            }
        }
        console.log(stockInfo)
        // stockInfo.combineFrom = [
        //     {stock:,old_amount:,amount:}
        // ]
        await stockInfo.save();
      }
      
      const combinedStock = new Stocks({
        zone,
        user:  stocksInfo[0].user,
        name: stocksInfo[0].name,
        lot_number: stocksInfo[0].lot_number,
        product_code: stocksInfo[0].product_code,
        inventory: stocksInfo[0].inventory,        
        product: stocksInfo[0].product,
        group_unit: stocksInfo[0].group_unit,
        unit: stocksInfo[0].unit,
        sub_unit: stocksInfo[0].sub_unit,
        is_sub:stocksInfo[0].sub_unit ? true:false,
        current_amount: stocksInfo[0].product.sub_unit ? calculate_amount_by_sub_amount(totalSubAmount,stocksInfo[0].product.item_per_unit): totalAmount,
        current_sub_amount: totalSubAmount,
      });
      console.log(combinedStock)
      await combinedStock.save();
      const from = list.map((stk) =>  {
        return {
          stock:stk.stock,
          zone:stk.zone,
          amount: stk.amount,
          sub_amount: stk.sub_amount
        }

      });
      const combine = new Combine({
        from: from,
        to: {
          stock: combinedStock,
          zone: combinedStock.zone,
          amount: combinedStock.current_amount,
          sub_amount: combinedStock.current_sub_amount,
        },
        remark:remark,
        user: req.user.id,
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
        const by_user = await User.findById(req.user.id)

        if(!by_user.admin){
            const alert = new AdminNotification({
                file:file_obj,
                type:'file',
                by_user:by_user,
                title:'สร้างเอกสาร',
                detail:'ทำการสร้างเอกสาร'
            })
            await alert.save()
            const io = req.app.get('socketio');
            io.to('admin').emit('action', {type:'new_alert',data:alert});
        }
        
        res.json(file_obj);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});
router.post('/update_file',auth, async (req, res) => {
    const { file_id,name } = req.body;
    
    try {
        const file  = await Files.findById(file_id)
        if(!file)
            return res.status(500).send('file not found')
        file.name = name
        console.log(file)
        await file.save()
        res.json(file);
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
    const { page=1,limit=10,start_date,end_date,is_active=true,search ,user} = req.body;
  
    try {
        //console.log(req.body)
        let query = {is_active:is_active}
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { 'name': { $regex: searchRegex } },
            ];
        }
        if(user){
            query.user = user
        }
        if(end_date && start_date){
            var start = new Date(start_date)
            start.setUTCHours(0,0,0,0);

            var end = new Date(end_date)
            end.setUTCHours(23,59,59,999);

            query.create_date = { $gte:start, $lte:end}
        }
        const list = await Files.find(query).populate('user').skip((page - 1) * limit).limit(limit).sort({create_date:-1});
        const total = await Files.countDocuments(query);
        //console.log(total)
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
    //   .then(() => //console.log('All data removed'))
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
                  name: stock.product.name,
                  lot_number: stock.lot_number,
                  product_code: stock.product_code,
                  amount: Math.floor(Math.random() * stock.current_amount) + 1
                }));
                const count = await User.countDocuments();
                const rand = Math.floor(Math.random() * count);
                const user = await User.findOne().skip(rand);
        
                //console.log(list)
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
                //console.log(`Invoice ${result._id} created with list:`, list);
            }
        }
       
       
        res.json({});
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
});
router.post('/list_zones_with_empty_flag', async (req, res) => {
    const {user} = req.body
    let query = {is_active:true,status:'warehouse'}
    if(user){
        query.user = user
    }
    try {

     // const stockList = await Stocks.find(query).distinct('zone')
      
      Zone.aggregate([
     
        {
          $lookup: {
            from: 'stocks',
            localField: '_id',
            foreignField: 'zone',
            as: 'stocks'
          }
        },
        {
            $addFields: {
              empty: {
                $cond: {
                  if: {
                    $gt: [
                      {
                        $size: {
                          $filter: {
                            input: '$stocks',
                            cond: { $eq: ['$$this.status', 'warehouse'] }
                          }
                        }
                      },
                      0
                    ]
                  },
                  then: 1,
                  else: 0
                }
              }
            }
          }
          ,
        {
            $project: {
              stocks: 0
            }
        },
      
        {
            $sort:
            {
                main: 1,
                x: 1,
                y: 1,
            }
        }
      ])
      .exec((err, zones) => {
        if (err) {
          console.error(err);
          res.status(500).send('Server error');
        } else {
          res.json({ zones });
        }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
});
router.post('/list_stock_from_zone', async (req, res) => {
    try {
        const {zone_id} = req.body
        const list = await Stocks.find({zone:zone_id,status:'warehouse'}).populate('product')
        res.json(list)
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
router.get('/find_far_away_empty_zone', async (req, res) => {
    try {
      const doorLocation = { x: 17, y: 15 }; // Coordinates of the door
    
      Zone.aggregate([
        {
          $lookup: {
            from: 'stocks',
            localField: '_id',
            foreignField: 'zone',
            as: 'stocks'
          }
        },
        {
          $match: {
            stocks: { $size: 0 },
            $expr: {
              $gt: [
                {
                  $sqrt: {
                    $add: [
                        { $pow: [ { $subtract: ["$location_x", doorLocation.x] }, 2 ] },
                        { $pow: [ { $subtract: ["$location_y", doorLocation.y] }, 2 ] }
                    ]
                  }
                },
                5 // Distance threshold, adjust as needed
              ]
            }
          }
        },
        {
          $limit: 1 // Limit the result to only one zone
        }
      ])
      .exec((err, zones) => {
        if (err) {
          console.error(err);
          res.status(500).send('Server error');
        } else {
          res.json({ zones });
        }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
router.get('/add_locationxy_tozone', async (req, res) => {
    try {
      const zones = await Zone.find({});
  
      const updatedZones = zones.map(zone => {
        // Modify the location_x and location_y values for each zone
        // Replace the below code with your logic to calculate the new values
        if(zone.main === 'A'){

            const location_x =zone.x;
            const location_y = zone.y;
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        else if(zone.main === 'B'){
            const location_x = 3+zone.x;
            const location_y = zone.y;
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        else if(zone.main === 'C'){
            const location_x = 7+zone.x;
            const location_y = zone.y;
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        else if(zone.main === 'D'){
            const location_x = 11+zone.x;
            const location_y = zone.y;
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        else if(zone.main === 'E'){
            const location_x = 15+zone.x;
            const location_y = zone.y;
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        else if(zone.main === 'F'){
            const location_x = 19+zone.x;
            const location_y = zone.y;
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        else if(zone.main === 'G'){
            const location_x = 23+zone.x;
            const location_y = zone.y;
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        else if(zone.main === 'H'){
            const location_x = 27+zone.x;
            const location_y = zone.y;
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        else if(zone.main === 'P'){

            const location_x =zone.x;
            const location_y = 10+ zone.y;
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        else if(zone.main === 'N'){
            const location_x = 3+zone.x;
            const location_y = 10+zone.y;
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        else if(zone.main === 'M'){
            const location_x = 7+zone.x;
            const location_y =10+ zone.y;
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        else if(zone.main === 'L'){
            const location_x = 11+zone.x;
            const location_y = 10+ zone.y;
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        
        else if(zone.main === 'K'){
            const location_x = 19+zone.x;
            const location_y = 10+zone.y;
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        else if(zone.main === 'J'){
            const location_x = 23+zone.x;
            const location_y = 10+zone.y;
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        else if(zone.main === 'I'){
            const location_x = 27+zone.x;
            const location_y = 10+ zone.y;
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        else{
            return {
                ...zone.toObject(),
                location_x,
                location_y
              };
        }
        
      });
  
      // Update the zones in the database
      await Promise.all(updatedZones.map(zone => Zone.findByIdAndUpdate(zone._id, zone)));
      console.log(updatedZones)
      res.json({ message: 'Location coordinates added to zones successfully' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

router.get('/find_zones_near_door', async (req, res) => {
    try {
        const doorLocation = { x: 17, y: 14 }; // Coordinates of the door

        // Find zones near the door based on location_x and location_y
        const zones = await Zone.find({
          location_x: { $gte: doorLocation.x - 1 },
          location_y: { $gte: doorLocation.y - 1 }
        });
  
      res.json({ zones });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
});
router.get('/update_data_stock', async (req, res) => {
    try {
        const stockList = await Stocks.find({status:'warehouse'}).populate('product')
        for (let i = 0; i < stockList.length; i++) {
            const stk = stockList[i];
            if(stk.product.sub_unit){
                stk.current_amount = calculate_amount_by_sub_amount(stk.current_sub_amount,stk.product.item_per_unit)
                stk.is_sub  = true
            }
            await stk.save()
        }
      res.json({ stockList });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
module.exports = router; 
