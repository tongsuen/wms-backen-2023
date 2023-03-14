const express = require('express')
const router = express.Router();
const {check, validationResult} = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('config')
const auth =require('../../middleware/auth')
const moment =  require('moment')

const mongoose = require('mongoose');

const User = require('../../models/User')
const Category = require('../../models/Category')
const Inventory = require('../../models/Inventory')
const Stocks = require('../../models/Stocks')
const StocksHistory = require('../../models/StocksHistory')
const Invoice = require('../../models/Invoices')
const Zone = require('../../models/Zone')
const Inbox = require('../../models/Inbox') 
const Note = require('../../models/Notes') 

router.post('/will_exp_stock',auth,async (req,res)=> {
    const { range = 30 } = req.body;
    console.log(range)
    const today = new Date();
    const thirtyDaysLater = new Date(today.getFullYear(), today.getMonth(), today.getDate() + range);

    const expiringInventory = await Inventory.find({ exp_date: { $gte: today, $lte: thirtyDaysLater } });

    const expiringStocks = await Stocks.find({ inventory: { $in: expiringInventory.map(item => item._id) },is_active:true }).populate('zone').populate('inventory');

    
    return res.json(expiringStocks)
})
router.post('/stock_with_notes',auth,async (req,res)=> {
    const { range = 5 } = req.body;
    const stkList = await Stocks.aggregate([
        {
          $match: { notes: { $exists: true, $not: { $size: 0 } } }
        },
        {
          $unwind: "$notes"
        },
        {
          $lookup: {
            from: 'inventories',
            localField: 'inventory',
            foreignField: '_id',
            as: 'inventory'
          }
        },
        {
          $lookup: {
            from: 'zones',
            localField: 'zone',
            foreignField: '_id',
            as: 'zone'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $project: {
            _id: 0,
            note: "$notes",
            inventory: { $arrayElemAt: ['$inventory', 0] },
            zone: { $arrayElemAt: ['$zone', 0] },
            user: { $arrayElemAt: ['$user', 0] },
          }
        },
        {
          $sort: { "note.create_date": -1 }
        },
        {
          $limit: 20
        }
      ]);
      return res.json(stkList)
})
router.post('/report_history',auth,async (req,res)=> {
    const { start_date, end_date } = req.body;

    const pipeline = [
    {
        $match: {
        create_date: {
            $gte: new Date(start_date),
            $lte: new Date(end_date)
        }
        }
    },
    {
        $group: {
        _id: {
            month: { $month: "$create_date" },
            year: { $year: "$create_date" }
        },
        total: { $sum: "$current_amount" },
        count: { $sum: 1 }
        }
    },
    {
        $project: {
        _id: 0,
        month: "$_id.month",
        year: "$_id.year",
        total: 1,
        count: 1
        }
    },
    {
        $sort: {
        year: 1,
        month: 1
        }
    }
    ];

    const stats = await StocksHistory.aggregate(pipeline);
    
    return res.json(stats)
})
router.post('/report_export', auth, async (req, res) => {
    const { range, userId,searchText } = req.body;
    console.log(req.body)
    let dateFilter = null;
    switch (range) {
      case 'last3':
        dateFilter = new Date();
        dateFilter.setMonth(dateFilter.getMonth() - 3);
        break;
      case 'last6':
        dateFilter = new Date();
        dateFilter.setMonth(dateFilter.getMonth() - 6);
        break;
      case 'last12':
        dateFilter = new Date();
        dateFilter.setFullYear(dateFilter.getFullYear() - 1);
        break;
      default:
        dateFilter = new Date();
        dateFilter.setFullYear(dateFilter.getFullYear() - 1);
        break;
    }
    
    let matchQuery =  { 
        type: 2, 
        create_date: { $gte: dateFilter },
       
      } 
    if(userId){
        matchQuery =  { 
            ...matchQuery,
            user:  mongoose.Types.ObjectId(userId),
            
          } 
    }

    console.log(matchQuery)
    if(searchText){
        matchQuery = {...matchQuery, $or: [
            { lot_number: { $regex: searchText, $options: 'i' } },
            { product_name: { $regex: searchText, $options: 'i' } },
            { name: { $regex: searchText, $options: 'i' } }
          ]}
    }
    const result = await Invoice.aggregate([
      // Match type 2 invoices for the given user ID and date range
      { 
        $match:matchQuery
      },
      // Project a new field "month" using the $dateToString operator
      {
        $project: {
          month: { $dateToString: { format: "%Y-%m", date: "$create_date" } },
          stock: 1,
          amount: 1
        }
      },
      // Join the stock collection to retrieve the name field
      {
        $lookup: {
          from: "stocks",
          localField: "stock",
          foreignField: "_id",
          as: "stockInfo"
        }
      },
      // Group the invoices by month, stock, and stock name and count the number of invoices in each group
      {
        $group: {
          _id: {
            month: "$month",
            stock: "$stock",
            name: { $arrayElemAt: [ "$stockInfo.name", 0 ] }
          },
          count: { $sum: 1 },
          total_amount: { $sum: "$amount" }
        }
      },
      // Project the output to show the month, stock, stock name, count, and total amount fields
      {
        $project: {
          month: "$_id.month",
          stock: "$_id.stock",
          name: "$_id.name",
          count: 1,
          total_amount: 1,
          _id: 0
        }
      },
      // Sort the results by month in ascending order
      { $sort: { month: 1 } }
    ]);
  
    console.log(result);
    return res.json(result);
});

router.post('/report_export_import', auth, async (req, res) => {
  const { range, userId,searchText,type = 2 } = req.body;
  console.log(req.body)
  let dateFilter = null;
  switch (range) {
    case 'last3':
      dateFilter = new Date();
      dateFilter.setMonth(dateFilter.getMonth() - 3);
      break;
    case 'last6':
      dateFilter = new Date();
      dateFilter.setMonth(dateFilter.getMonth() - 6);
      break;
    case 'last12':
      dateFilter = new Date();
      dateFilter.setFullYear(dateFilter.getFullYear() - 1);
      break;
    default:
      dateFilter = new Date();
      dateFilter.setFullYear(dateFilter.getFullYear() - 1);
      break;
  }
  
  let matchQuery =  { 
      type: type, 
      create_date: { $gte: dateFilter },
     
    } 
  if(userId){
      matchQuery =  { 
          ...matchQuery,
          user:  mongoose.Types.ObjectId(userId),
          
        } 
  }

  console.log(matchQuery)
  if(searchText){
      matchQuery = {...matchQuery, $or: [
          { lot_number: { $regex: searchText, $options: 'i' } },
          { product_name: { $regex: searchText, $options: 'i' } },
          { name: { $regex: searchText, $options: 'i' } }
        ]}
  }
  const result = await Invoice.aggregate([
    // Match type 2 invoices for the given user ID and date range
    { 
      $match:matchQuery
    },
    // Project a new field "month" using the $dateToString operator
    {
      $project: {
        month: { $dateToString: { format: "%Y-%m", date: "$create_date" } },
        stock: 1,
        amount: 1
      }
    },
    // Join the stock collection to retrieve the name field
    {
      $lookup: {
        from: "stocks",
        localField: "stock",
        foreignField: "_id",
        as: "stockInfo"
      }
    },
    // Group the invoices by month, stock, and stock name and count the number of invoices in each group
    {
      $group: {
        _id: {
          month: "$month",
          stock: "$stock",
          name: { $arrayElemAt: [ "$stockInfo.name", 0 ] }
        },
        count: { $sum: 1 },
        total_amount: { $sum: "$amount" }
      }
    },
    // Project the output to show the month, stock, stock name, count, and total amount fields
    {
      $project: {
        month: "$_id.month",
        stock: "$_id.stock",
        name: "$_id.name",
        count: 1,
        total_amount: 1,
        _id: 0
      }
    },
    // Sort the results by month in ascending order
    { $sort: { month: 1 } }
  ]);

  console.log(result);
  return res.json(result);
});
router.post('/report_most_import', auth, async (req, res) => {

  const {user_id,range = 400} = req.body

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (range * 24 * 60 * 60 * 1000));

  console.log(startDate)
  let matchQuery = {
      type: 1 ,
      //create_date: { $gte: startDate, $lte: endDate } // Only consider invoices within the date range

  }
  if(user_id) matchQuery.user =  mongoose.Types.ObjectId(user_id)

  const result = await Invoice.aggregate([
    {
      $match: matchQuery // Only consider stock in invoices
    },
    {
      $group: {
        _id: {
          month: { $month: "$create_date" },
          year: { $year: "$create_date" },
          stock: "$stock"
        },
        imported_amount: { $sum: "$amount" }
      }
    },
    {
      $group: {
        _id: {
          month: "$_id.month",
          year: "$_id.year"
        },
        top_stock: { $first: "$_id.stock" }, // Get the stock with the highest imported amount in each month
        imported_amount: { $first: "$imported_amount" }
      }
    },
    {
      $lookup: {
        from: "stocks", // The name of the Stock collection
        localField: "top_stock",
        foreignField: "_id",
        as: "stock"
      }
    },
    {
      $project: {
        _id: 0,
        month: "$_id.month",
        year: "$_id.year",
        stock: {
          id: { $arrayElemAt: ["$stock._id", 0] },
          name: { $arrayElemAt: ["$stock.name", 0] }
        },
        imported_amount: 1
      }
    },
    {
      $sort: { year: -1, month: -1 } // Sort by year, month, and imported amount
    }
  ]);

  return res.json(result);
});

  
router.post('/report_most_export', auth, async (req, res) => {
  const {user_id,range = 400} = req.body

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (range * 24 * 60 * 60 * 1000));

  console.log(startDate)
  let matchQuery = {
      type: 2 ,
      create_date: { $gte: startDate, $lte: endDate } // Only consider invoices within the date range

  }
  try {
    if(user_id) matchQuery.user =  mongoose.Types.ObjectId(user_id)
    const result = await Invoice.aggregate([
      {
        $match:matchQuery
      },
      {
        $group: {
          _id: {
            month: { $month: "$create_date" },
            year: { $year: "$create_date" },
            stock: "$stock"
          },
          exported_amount: { $sum: "$amount" }
        }
      },
      
      {
        $group: {
          _id: {
            month: "$_id.month",
            year: "$_id.year"
          },
          top_stock: { $first: "$_id.stock" }, // Get the stock with the highest exported amount in each month
          exported_amount: { $first: "$exported_amount" }
        }
      },
      {
        $lookup: {
          from: "stocks", // The name of the Stock collection
          localField: "top_stock",
          foreignField: "_id",
          as: "stock"
        }
      },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          year: "$_id.year",
          stock: {
            id: { $arrayElemAt: ["$stock._id", 0] },
            name: { $arrayElemAt: ["$stock.name", 0] }
          },
          exported_amount: 1
        }
      },
      {
        $sort: { year: -1, month: -1 } // Sort by year, month, and exported amount
      },
    ]);
    return res.json(result);
  } catch (error) {
    
    return res.status(500).json({error:error});
  }
  
});


router.post('/longest_stock', auth, async (req, res) => {
  const {user_id}  = req.body
  let matchQuery = {
    is_active: true ,

  }
  try {
    if(user_id) matchQuery.user =  mongoose.Types.ObjectId(user_id)

    const result = await Stocks.aggregate([
      {
        $match : matchQuery
      },
      {
        $addFields: {
          days_in_warehouse: { $divide: [{ $subtract: [new Date(), "$create_date"] }, 1000 * 60 * 60 * 24] } // Calculate the number of days the stock has been in the warehouse
        }
      },
      {
        $sort: { days_in_warehouse: -1 } // Sort the stocks by the number of days in descending order
      },
      {
        $limit: 10 // Return only the top 10 stocks
      },
      {
        $project: {
          _id: 1,
          name: 1,
          days_in_warehouse: 1,
          create_date:1,
        }
      }
    ]);
    console.log(result)
    return res.json(result);
  } catch (error) {
    
    res.status(500).send(err.message)
  }
  
})
router.post('/report_data', auth,async (req,res)=> {
    const {start_date,end_date,product_code = [],lot_number = [],product_name = [],type =1,is_customer= false } = req.body;
    try {
         let start =moment(start_date).startOf('day').toDate();
         let end =moment(end_date).endOf('day').toDate()
        
        if(type == 1){
            var query = []
            if(product_code.length > 0) query.push({product_code : {$in : product_code}}) 
            if(product_name.length > 0) query.push({name : {$in : product_name}}) 
            if(lot_number.length > 0) query.push({lot_number : {$in : lot_number}}) 
          
            console.log(query);
            var final_query = {}
            if(query.length == 0){
                final_query.create_date = {'$gte':start,'$lte':end};
                if(is_customer){
                    final_query.user = req.user.id
                }
            }
            else{
                if(is_customer)
                    final_query = {$or:query,create_date:{'$gte':start,'$lte':end},is_active : true,user:req.user.id}
                else 

                    final_query = {$or:query,create_date:{'$gte':start,'$lte':end},is_active : true}
            }


            var list = await Stocks.find(final_query).populate('inventory').populate({path: 'notes'})
            return res.json(list)
        }
        else  if(type == 2){
            var query = []
            if(product_code.length > 0) query.push({product_code : {$in : product_code}}) 
            if(product_name.length > 0) query.push({name : {$in : product_name}}) 
            if(lot_number.length > 0) query.push({lot_number : {$in : lot_number}}) 

            var final_query = {}
            if(query.length == 0){
                final_query.create_date = {'$gte':start,'$lte':end};
                if(is_customer){
                    final_query.user = req.user.id
                }
            }
            else{
                if(is_customer)
                    final_query = {$or:query,create_date:{'$gte':start,'$lte':end},is_active : true,user:req.user.id}
                else 

                    final_query = {$or:query,create_date:{'$gte':start,'$lte':end},is_active : true}
            }

            var list = await StocksHistory.find(final_query).populate('inventory')
           
            return res.json(list)
        }
        else if (type == 3){
            var query = []
            if(product_code.length > 0) query.push({product_code : {$in : product_code}}) 
            if(product_name.length > 0) query.push({name : {$in : product_name}}) 
            if(lot_number.length > 0) query.push({lot_number : {$in : lot_number}}) 

            var final_query = {}
            if(query.length == 0){
                final_query.create_date = {'$gte':start,'$lte':end};
                if(is_customer){
                    final_query.user = req.user.id
                }
            }
            else{
                if(is_customer)
                    final_query = {$or:query,create_date:{'$gte':start,'$lte':end},is_active : true,user:req.user.id}
                else 

                    final_query = {$or:query,create_date:{'$gte':start,'$lte':end},is_active : true}
            }

            var list = await Invoice.find(final_query).populate('inventory').populate('stock')
           
            
            return res.json(list)
        }
        return res.status(400).send('Data Error')

    }catch(err){
        console.log(err.message);
        res.status(500).send(err.message)
    }
})

module.exports = router; 
