const express = require('express')
const router = express.Router();
const {check, validationResult} = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('config')
const auth =require('../../middleware/auth')
const moment =  require('moment')

const mongoose = require("mongoose");

const User = require('../../models/User')
const Invoices = require('../../models/Invoices')

const Inventory = require('../../models/Inventory')
const Stocks = require('../../models/Stocks')
const StocksHistory = require('../../models/StocksHistory')
const Zone = require('../../models/Zone')

router.post('/get_stock',async (req,res)=> {
    const {stock_id} = req.body;
    console.log(req.body)
    try {
        const stock = await Stocks.findOne({_id:stock_id}).populate('inventory')
        return res.json(stock)
    }catch(err){
        console.log(err.message);
        res.status(500).send('Server Error')
    }
})


module.exports = router; 