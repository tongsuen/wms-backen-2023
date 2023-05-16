const express = require('express')
const router = express.Router();
const {check, validationResult} = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('config')
const auth =require('../../middleware/auth')
const moment =  require('moment')


const User = require('../../models/User')
const Order = require('../../models/Order')

const Inventory = require('../../models/Inventory')
const Stocks = require('../../models/Stocks')
const StocksHistory = require('../../models/StocksHistory')
const Zone = require('../../models/Zone')
const AdminNotification = require('../../models/AdminNotification')


router.post('/create_order',auth,async (req,res)=> {
   
    const {order_id} = req.body;

    try {
        const order =  new Order(req.body)
        await order.save()
        return res.json(order)

    }catch(err){
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/remove_order',auth,async (req,res)=> {
   
    const {order_id} = req.body;

    try {
        const del = await Order.deleteOne({_id:order_id})

        return res.json(del)

    }catch(err){
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/update_order',auth,async (req,res)=> {
   
    //console.log(req.body)
    try {
        Order.findOneAndUpdate({_id:req.body._id}, req.body, function(err, doc) {
            if (err) return res.send(500, {error: err});
            return res.send(doc);
        });

    }catch(err){
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/sync_order_to_iventory',auth,async (req,res)=> {
    const {order_id} = req.body
    try {
        const order = await Order.findById(order_id)

        for (let i = 0; i < order.list.length; i++) {
            const item = order.list[i];
            const obj = {
                name:item.name,
                product:item.product,
                amount:item.amount,
                weight:item.weight,
                number_pallate:item.number_pallate,
                lot_number:item.lot_number,
                product_code:item.product_code,
                user:order.user,
                current_amount:item.amount,
                total_sub_unit:item.sub_amount,
            }
            const inventory = new Inventory(obj)
          
            await inventory.save()
        }
        
        return res.send({success:true});

    }catch(err){
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/list_order',auth,async (req,res)=> {
    const {search,user,page = 1,limit=10,sort='create_date'} = req.body;
    
    try {
        let query = {}

        let sort_query = {}
        if(sort === 'create_date'){
            sort_query.create_date = -1
        }
        else if(sort === 'import_date'){
            sort_query.import_date = 1
            var start = new Date();
            start.setHours(0, 0, 0, 0);
            //console.log(start)
            query.import_date = { $gte:start}
        }

        if(user)
            query.user = user
        if(search)
        {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                    { driver: { $regex: searchRegex } },
                    { car_code: { $regex: searchRegex } },
            ];
        }

        const list = await Order.find(query).populate('user').sort(sort_query).skip((page - 1) * limit).limit(limit);

        const total = await Order.countDocuments(query);
        
        return res.json({
            page:page,
            list:list,
            total:total
        })

    }catch(err){
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/get_order',auth,async (req,res)=> {
    const {order_id} = req.body;
    
    try {
        
        const order = await Order.findById(order_id).populate('user').sort({create_date: -1})
        return res.json(order)

    }catch(err){
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})
module.exports = router; 
