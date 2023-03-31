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

router.post('/create_order',async (req,res)=> {

    try {
        const order = await Order.create(req.body)
        console.log(order);
        
        return res.json(order)

    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

module.exports = router; 
