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
const Location = require('../../models/Location')
const Product = require('../../models/Product')
const { handleError } = require('../../utils/handleError')


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
       
         return res.status(500).json(handleError(err))
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
       
         return res.status(500).json(handleError(err))
    }
})
router.post('/search_stock_by_name',async (req,res)=> {
    const {keyword} = req.body;
    try {
        console.log(req.body);
        const list = await Stocks.find({name:{$regex:keyword,$options:'i'}})
    
        return res.json(list)
    }catch(err){
       
         return res.status(500).json(handleError(err))
    }
})
router.post('/search_stock_by_name',async (req,res)=> {
    const {keyword} = req.body;
    try {
        console.log(req.body);
        const list = await Stocks.find({name:{$regex:keyword,$options:'i'}})
    
        return res.json(list)
    }catch(err){
       
         return res.status(500).json(handleError(err))
    }
})
router.post('/search_stock_by_product_code',async (req,res)=> {
    const {keyword} = req.body;
    try {
        console.log(req.body);
        const list = await Stocks.find({product_code:{$regex:keyword,$options:'i'}})
    
        return res.json(list)
    }catch(err){
       
         return res.status(500).json(handleError(err))
    }
})
router.post('/search_stock_by_lot_number',async (req,res)=> {
    const {keyword} = req.body;
    try {
        console.log(req.body);
        const list = await Inventory.find({lot_number:{$regex:keyword,$options:'i'}})
    
        return res.json(list)
    }catch(err){
       
         return res.status(500).json(handleError(err))
    }
})

router.post('/autocomplete_lot_number',auth,async (req,res)=> {
    const {keyword} = req.body;
    try {
        console.log(req.user.id);
        
        const list_inv = await Inventory.find({lot_number:{"$regex":keyword, '$options' : 'i'  },user:req.user.id})
        
        return res.json(list_inv)
    }catch(err){
       
         return res.status(500).json(handleError(err))
    }
})

router.post('/autocomplete_product',auth,async (req,res)=> {
    const {keyword,user} = req.body;
    try {
        console.log(req.user.id);
        let query = {
            is_active:true
        }
        if(user){
            query.user = user ? user : req.user.id
        }
        if (keyword) {
            const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.name = {
              $regex: escapedKeyword,
              $options: 'i'
            };
          }
        const list_inv = await Product.find(query)
        
        return res.json(list_inv)
    }catch(err){
       
         return res.status(500).json(handleError(err))
    }
})

router.post('/autocomplete_inventory_name',auth,async (req,res)=> {
    const {keyword} = req.body;
    try {
        console.log(keyword);
        const searchRegex = new RegExp(keyword, 'i');

        const list_inv = await Inventory.find({name: { $regex: searchRegex, '$options' : 'i'  }})
        
        return res.json(list_inv)
    }catch(err){
       
         return res.status(500).json(handleError(err))
    }
})
router.post('/autocomplete_location',auth,async (req,res)=> {
    const {keyword} = req.body;
    try {
        console.log(keyword);
        const searchRegex = new RegExp(keyword, 'i');

        const list_inv = await Location.find({
            $or: [
                { name: { $regex: searchRegex } },
                { detail: { $regex: searchRegex } }
              ]
        }).sort({create_date:-1}).limit(5)
        
        return res.json(list_inv)
    }catch(err){
       
         return res.status(500).json(handleError(err))
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
       
         return res.status(500).json(handleError(err))
    }
})
module.exports = router; 
