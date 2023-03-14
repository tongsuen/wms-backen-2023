const express = require('express')
const router = express.Router();
const {check, validationResult} = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('config')
const auth =require('../../middleware/auth')
const moment =  require('moment')


const User = require('../../models/User')
const Category = require('../../models/Category')

const Inventory = require('../../models/Inventory')
const Stocks = require('../../models/Stocks')
const StocksHistory = require('../../models/StocksHistory')
const Zone = require('../../models/Zone')

router.post('/search_inventory',async (req,res)=> {
    const {keyword,id,start_date,end_date} = req.body;
    try {
        if(id){
            const item = await  Inventory.findOne({_id:id});
            return res.json(item)
        }
     
        const list = await Inventory.find({$text:{$search: keyword } })
        console.log(list);
        
        return res.json(list)

    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/search_stocks_by_inventory',async (req,res)=> {
    const {keyword,id,start_date,end_date} = req.body;
    try {
        console.log(keyword);
        if(id){
            const item = await Stocks.findOne({inventory:{_id:id}});
            return res.json(item)
        }
        const list_inv = await Inventory.find({$text:{$search: keyword} })
        
        const list = await Stocks.find( { inventory : { $in : list_inv } } ).populate('inventory').populate('user')
        return res.json(list)
    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/search_stock_by_name',async (req,res)=> {
    const {keyword} = req.body;
    try {
        console.log(req.body);
        const list = await Stocks.find({name:{$regex:keyword,$options:'i'}})
    
        return res.json(list)
    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/search_stock_by_name',async (req,res)=> {
    const {keyword} = req.body;
    try {
        console.log(req.body);
        const list = await Stocks.find({name:{$regex:keyword,$options:'i'}})
    
        return res.json(list)
    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/search_stock_by_product_code',async (req,res)=> {
    const {keyword} = req.body;
    try {
        console.log(req.body);
        const list = await Stocks.find({product_code:{$regex:keyword,$options:'i'}})
    
        return res.json(list)
    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/search_stock_by_lot_number',async (req,res)=> {
    const {keyword} = req.body;
    try {
        console.log(req.body);
        const list = await Inventory.find({lot_number:{$regex:keyword,$options:'i'}})
    
        return res.json(list)
    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/autocomplete_lot_number',auth,async (req,res)=> {
    const {keyword} = req.body;
    try {
        console.log(req.user.id);
        
        const list_inv = await Inventory.find({lot_number:{"$regex":keyword },user:req.user.id})
        
        return res.json(list_inv)
    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/list_inventory',auth,async (req,res)=> {
    const {admin} = req.body;
    try {
        console.log(req.user.id);
        if(admin){
            const list_inv = await Inventory.find()
            return res.json(list_inv) 
        }
        const list_inv = await Inventory.find({user:req.user.id})
        console.log(list_inv)
        return res.json(list_inv)
    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})
module.exports = router; 
