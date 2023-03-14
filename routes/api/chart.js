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

router.post('/total_item_in_zone', auth,async (req,res)=> {
    const {name,user} = req.body;
    try {
        console.log(req.user.id)
        const list = await Stocks.aggregate([
            
            { $match: { is_active: true,user: new mongoose.Types.ObjectId(req.user.id) } },
            { $group: { _id: "$zone", total: { $sum: "$current_amount" } } },
            { $sort: { total: -1 } },
            { $lookup: {
                from: Zone.collection.name,
                localField: "_id",
                foreignField: "_id",
                as: "zones"
            }},
         ])
         return res.json(list)
    }catch(err){
        console.log(err.message);
        res.status(500).send('p Error')
    }
})
router.post('/history_by_date', auth,async (req,res)=> {
    const {name,user} = req.body;
    try {
        
        const list = await StocksHistory.aggregate([
            
            { $match: { is_active: true } },
            { $group: { _id:{ $dateToString: { format: "%Y-%m-%d", date: "$create_date"} }, total: { $sum: "$current_amount" } } },
            { $sort: { total: -1 } },
            { $lookup: {
                from: Inventory.collection.name,
                localField: "_id",
                foreignField: "_id",
                as: "inventory"
            }},
         ])
         return res.json(list)
    }catch(err){
        console.log(err.message);
        res.status(500).json({message:err.message,error:true})
    }
})
router.post('/stock_by_user', auth,async (req,res)=> {
    const {name,user} = req.body;
    try {
        
        const list = await Stocks.aggregate([
            
            { $match: { is_active: true } },
            { $group: { _id:'$user', total: { $sum: "$current_amount" } } },
            { $sort: { total: -1 } },
            { $lookup: {
                from: User.collection.name,
                localField: "_id",
                foreignField: "_id",
                as: "user"
            }},
            
         ])
         return res.json(list)
    }catch(err){
        console.log(err.message);
        res.status(500).json({message:err.message,error:true})
    }
})
router.post('/stocks_out',async (req,res)=> {
    const {name,user} = req.body;
    try {
        
        const list = await Stocks.aggregate([
            
            { $match: { is_active: true } },
            { $group: { _id:'$user', total: { $sum: "$current_amount" } } },
            { $sort: { total: -1 } },
            { $lookup: {
                from: User.collection.name,
                localField: "_id",
                foreignField: "_id",
                as: "user"
            }},
            
         ])
         return res.json(list)
    }catch(err){
        console.log(err.message);
        res.status(500).json({message:err.message,error:true})
    }
})
router.post('/stock_out',async (req,res)=> {
    const {user} = req.body;
    try {
        query = {};
        if(user) query.user = user;
        const list = await Invoices.aggregate([
          
            { $group: { _id:  { year: { $year: "$create_date" }, month: { $month: "$create_date" } }, total: { $sum: "$amount" } } },
            { $sort:{ "_id.month":1 } },
           
            
         ])
         console.log(list);
         
         return res.json(list)
    }catch(err){
        console.log(err.message);
        res.status(500).json({message:err.message,error:true})
    }
})
router.post('/stock_out_by_month',auth,async (req,res)=> {
    const {user,year} = req.body;
    try {
        query = {start:new Date("2022-01-01T00:00:00.0Z"),end:new Date("2022-12-31T00:00:00.0Z")};
        if(year){
            query.start = year +"-01-01T00:00:00.0Z"
            query.end = year +"-12-31T00:00:00.0Z"
        }
        if(user) query.user = user;
        const list = await Invoices.aggregate([
            {
                $match: {
                    create_date: {$gte: new Date(query.start), $lt: new Date(query.end)},
                    type:2,
                    status:2,
                    user: new mongoose.Types.ObjectId(req.user.id) 
                }
            },
            { $group: { _id:   { $month: "$create_date" } , total: { $sum: "$amount" } } },
            {
                $group: {
                    _id: null,
                    array: { $push: "$$ROOT" }
                }
            },
            {
                $addFields: {
                    array: {
                        $map: {
                            input: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                            as: "month",
                            in: {
                                $let: {
                                    vars: {
                                        index: { $indexOfArray: ["$array._id", "$$month"] }
                                    },
                                    in: {
                                        $cond: [
                                            { $gt: ["$$index", -1] },
                                            { $arrayElemAt: ["$array", "$$index"] },
                                            { _id: "$$month", total: 0 }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            },
            { $unwind: "$array" },
            {
                $sort: { "array._id": 1 }
            },
            {
                $project: {
                    _id: 0,
                    total: "$array.total",
                    month: "$array._id"
                }
            }
            
         ])
         console.log(list);
         
         return res.json(list)
    }catch(err){
        console.log(err.message);
        res.status(500).json({message:err.message,error:true})
    }
})
router.post('/stock_in_by_month',auth,async (req,res)=> {
    const {user,year} = req.body;
    try {
        query = {start:new Date("2022-01-01T00:00:00.0Z"),end:new Date("2022-12-31T00:00:00.0Z")};
        if(year){
            query.start = year +"-01-01T00:00:00.0Z"
            query.end = year +"-12-31T00:00:00.0Z"
        }
        if(user) query.user = user;
      
        const list = await Invoices.aggregate([
            {
                $match: {
                    create_date: {$gte: new Date(query.start), $lt: new Date(query.end)},
                    type:1,
                    user: new mongoose.Types.ObjectId(req.user.id) 
                }
            },
            { $group: { _id:   { $month: "$create_date" } , total: { $sum: "$amount" } } },
            {
                $group: {
                    _id: null,
                    array: { $push: "$$ROOT" }
                }
            },
            {
                $addFields: {
                    array: {
                        $map: {
                            input: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                            as: "month",
                            in: {
                                $let: {
                                    vars: {
                                        index: { $indexOfArray: ["$array._id", "$$month"] }
                                    },
                                    in: {
                                        $cond: [
                                            { $gt: ["$$index", -1] },
                                            { $arrayElemAt: ["$array", "$$index"] },
                                            { _id: "$$month", total: 0 }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            },
            { $unwind: "$array" },
            {
                $sort: { "array._id": 1 }
            },
            {
                $project: {
                    _id: 0,
                    total: "$array.total",
                    month: "$array._id"
                }
            }
            
         ])
         console.log(list);
         
         return res.json(list)
    }catch(err){
        console.log(err.message);
        res.status(500).json({message:err.message,error:true})
    }
})

router.post('/history', auth,async (req,res)=> {
    const {user} = req.body;
    try {
        query = {};
        if(user) query.user = user;
        const list = await StocksHistory.aggregate([
          
            { $group: { _id: {day:'$day',month:'$month',year:'$year'}, total: { $sum: "$current_amount" } } },
            { $sort: { "_id.month":1 ,"_id.day":1 } },
           
            
         ])
         console.log(list);
         
         return res.json(list)
    }catch(err){
        console.log(err.message);
        res.status(500).json({message:err.message,error:true})
    }
})
module.exports = router; 