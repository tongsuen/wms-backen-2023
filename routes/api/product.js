const express = require('express')
const router = express.Router();
const { ObjectId } = require('mongodb');

const auth =require('../../middleware/auth')
const moment =  require('moment')

const {upload_inboxs,upload_invoices,upload_notes,upload_inventories,delete_obj} = require('../../s3')
const {sendMessage} = require('../../push_noti')
const User = require('../../models/User')
const Category = require('../../models/Category')
const Inventory = require('../../models/Inventory')
const Stocks = require('../../models/Stocks')
const StocksHistory = require('../../models/StocksHistory')
const Invoice = require('../../models/Invoices')
const Zone = require('../../models/Zone')
const Inbox = require('../../models/Inbox') 
const Note = require('../../models/Notes') 
const Alert = require('../../models/Alert') 
const Combine = require('../../models/Combine') 

const Notification = require('../../models/Notification') 
const AdminNotification = require('../../models/AdminNotification') 
const Location = require('../../models/Location') 
const Product = require('../../models/Product') 
const { handleError } = require('../../utils/handleError')


router.post('/create',[auth,upload_inventories.array('images')],async (req,res)=> {
        const {type} = req.body
    try {
        console.log(req.files);//req.file.path
        console.log(req.body);
        const name = req.body.name
        const old = await Product.findOne({name:name})
        if(old){
            return res.status(400).json({ message: 'product name is already exist!' })
        }
        const product = new Product(req.body)
        await Promise.all(req.files.map(async (file) => {
            product.images.push(file.location)
        }))
        if(product.images.length > 0){
            product.image = product.images[0]
        }
        await product.save()
        return res.status(200).send(product)
        
    }catch(err){
        
       
         return res.status(500).json(handleError(err))
    }
})
router.post('/list_for_select',[auth],async (req,res)=> {

    const {user_id,search} = req.body;
    try {
     
        var query ={
            is_active:true
        };
        if(user_id!== undefined) query.user = user_id;
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                    { 'name': { $regex: searchRegex } },
                    { 'detail': { $regex: searchRegex } },
            ];
        }
        const list = await Product.find(query).populate('user','-password').sort( { create_date: -1 } );

        res.json(list)
    }catch(err){
       
         return res.status(500).json(handleError(err))
    }
})
router.post('/list', [auth], async (req, res) => {
    const { user = null, search, page = 1, limit = 10 } = req.body;
    try {
      console.log(req.body);
  
      const query = {
        is_active: true
      };
      if (user) query.user = user;
      if (search) {
        const escapedKeyword = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        query.$or = [
          { 'name': { $options: 'i', $regex: escapedKeyword } },
          { 'detail': { $options: 'i', $regex: escapedKeyword } },
          { 'main_code': { $options: 'i', $regex: escapedKeyword } },
          { 'sub_code': { $options: 'i', $regex: escapedKeyword } }
        ];
      }
      console.log(query);
      
      const list = await Product.find(query).populate('user', '-password')
        .sort({ create_date: -1 }).skip((page - 1) * limit).limit(limit);
        
      const total = await Product.countDocuments(query);
      console.log(list);
  
      res.json({
        page: page,
        list: list,
        total: total
      });
    } catch (err) {
       
         return res.status(500).json(handleError(err))
    }
  });
  
router.post('/list_stock_by_product',[auth],async (req,res)=> {

    const {user,search,page = 1,limit = 10} = req.body;
    try {
        Stocks.aggregate([
            {
              $group: {
                _id: '$name',
                totalAmount: { $sum: '$current_amount' },
              },
            },
          ], (err, results) => {
            if (err) {
                res.status(500).send({msg:'error'})
            } else {
                return res.status(200).send(product)
            }
          });
       

    }catch(err){
       
         return res.status(500).json(handleError(err))
    }
})
router.post('/get',auth,async (req,res)=> {
    const {product_id} = req.body
    try {
        console.log(req.body);
        const product = await Product.findById(product_id)
    
        return res.status(200).send(product)
        
    }catch(err){
       
         return res.status(500).json(handleError(err))
    }
})
router.post('/remove',auth,async (req,res)=> {
    const {product_id} = req.body
    try {
        console.log(req.body);
        const product = await Product.findById(product_id)
        product.is_active = false
        await product.save()
        return res.status(200).send(product)
        
    }catch(err){
       
         return res.status(500).json(handleError(err))
    }
})
router.post('/update', [auth,upload_inventories.array('images')],async (req,res)=> {

    try {
        console.log(req.files);//req.file.path
        console.log(req.body);
        var query = req.body;
    
        let inv = await Product.findById(query._id)
        if(query.old_images){
            let difference = inv.images.filter(x => !query.old_images.includes(x))
            for (let i = 0; i < difference.length; i++) {
                const old = difference[i];
                delete_obj(old)
            }
            inv.images = query.old_images
            if(inv.images.length > 0){
                inv.image = inv.images[0]
            }
            inv = await inv.save()
        }
        else{
            for (let i = 0; i < inv.images.length; i++) {
                const old = inv.images[i];
                delete_obj(old)
            }
            inv.images = []
            inv.image = null
            inv = await inv.save()
        }
        if(req.files){
            var array = inv.images
            await Promise.all(req.files.map(async (file) => {
                array.push(file.location)
            }))
            query.images = array;
        }

        if(query.images.length > 0){
            query.image = query.images[0]
        }
        if(!query.sub_unit){
            query.sub_unit = null
        }
        let isSameName = true
        if(query.name !== inv.name){
            isSameName = false
        }
        Product.findOneAndUpdate({_id: query._id},{$set:query},{new:true, upsert: false},async function(err,data){
            if(err){
                return res.status(500).json(err);
            } else {
                if(!isSameName){
                    await Stocks.updateMany(
                        { product: query._id },
                        { $set: { name: query.name } }
                      );
                    await Inventory.updateMany(
                        { product: query._id },
                        { $set: { name: query.name } }
                    );
                }
                if(!req.user.admin){

                    const alert = new AdminNotification({
                        product: data._id,
                        type: 'update',
                        user: req.user.id,
                        by_user:  req.user.id,
                        title: 'ข้อความถึงผู้ดูเเล',
                        detail: ('อัพเดตข้อมูล: ' + data.name)
                    })
                    const io = req.app.get('socketio');
                    io.to('admin').emit('action', { type: 'new_alert', data: alert });
                    alert.save()
                    
                }
                return res.json(data);
            }
        });
    }catch(err){
       
         return res.status(500).json(handleError(err))
    }
})

module.exports = router; 
