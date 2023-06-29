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
const StockTask = require('../../models/StockTask') 

router.post('/will_exp_stock',auth,async (req,res)=> {
    const { range = 30,user } = req.body;
   
    try {
      const today = new Date();
      const thirtyDaysLater = new Date(today.getFullYear(), today.getMonth(), today.getDate() + range);
      console.log(thirtyDaysLater)


      const expiringInventory = await Inventory.find({ exp_date: { $gte: today, $lte: thirtyDaysLater } });
      let query = { inventory: { $in: expiringInventory.map(item => item._id) },is_active:true }
      if(user) query.user = user
      const expiringStocks = await Stocks.find(query).populate('zone').populate('inventory');
    
      return res.json(expiringStocks)
    } catch (error) {
    
       res.status(500).send(error.message)
    }

})
router.post('/latest_import', auth,async (req, res) => {
  const {limit = 10} = req.body
  try {
    const list = await Inventory
      .find({ is_active:true,status:'accept',user:req.user.id })
      .populate('product')
      .sort({ create_date: -1 })
      .limit(limit);
   
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.post('/latest_export',auth, async (req, res) => {
  const {limit = 10} = req.body
  try {
    const list = await Invoice
      .find({ is_active:true,status:'accept',user:req.user.id  })
      .populate('export_list.stock')
      .populate('to')
      .sort({ create_date: -1 })
      .limit(limit);
   
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/exp_stock',auth,async (req,res)=> {
  const expiredInventory = await Inventory.find({ exp_date: { $lte: new Date() } });
  const expiredStocks = await Stocks.find({ inventory: { $in: expiredInventory.map(item => item._id) }, is_active: true }).populate('zone').populate('inventory');
  return res.json(expiredStocks);
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
     
        create_date: { $gte: dateFilter },
      
      } 
    if(userId){
        matchQuery =  { 
            ...matchQuery,
            user:  mongoose.Types.ObjectId(userId),
            
          } 
    }
    console.log("==>")
    console.log(matchQuery)
    if(searchText){
        matchQuery = {...matchQuery, $or: [
            { lot_number: { $regex: searchText, $options: 'i' } },
            { product_name: { $regex: searchText, $options: 'i' } },
            { name: { $regex: searchText, $options: 'i' } }
          ]}
    }
    const pipeline = [
    {
      
        $match:matchQuery
      
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
    console.log(stats)
    return res.json(stats)
})
router.post('/report_import', auth, async (req, res) => {
  const { range, userId,searchText,type = 1 } = req.body;
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
        inventory: 1,
        amount: 1
      }
    },
    // Join the stock collection to retrieve the name field
    {
      $lookup: {
        from: "inventory",
        localField: "inventory",
        foreignField: "_id",
        as: "inventoryInfo"
      }
    },
    // Group the invoices by month, stock, and stock name and count the number of invoices in each group
    {
      $group: {
        _id: {
          month: "$month",
          inventory: "$inventory",
          name: { $arrayElemAt: [ "$inventoryInfo.name", 0 ] }
        },
        count: { $sum: 1 },
        total_amount: { $sum: "$amount" }
      }
    },
    // Project the output to show the month, stock, stock name, count, and total amount fields
    {
      $project: {
        month: "$_id.month",
        inventory: "$_id.inventory",
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

  let matchQuery = {
      type: 1 ,
      //create_date: { $gte: startDate, $lte: endDate } // Only consider invoices within the date range

  }

  if(user_id) matchQuery.user =  mongoose.Types.ObjectId(user_id)

  try {
    result = await Invoice.aggregate([
      // Match only documents with import_list array
      { $match: { import_list: { $exists: true, $not: { $size: 0 } } } },
      // Unwind the import_list array to de-normalize it
      { $unwind: "$import_list" },
      // Extract the month and year from the invoice's create_date
      {
        $addFields: {
          month: { $month: "$create_date" },
          year: { $year: "$create_date" }
        }
      },
      // Group by name, month, and year and sum the amount
      {
        $group: {
          _id: {
            name: "$import_list.name",
            month: "$month",
            year: "$year"
          },
          total_exported: { $sum: "$import_list.amount" }
        }
      },

      {
        $project: {
          _id: 0,
          month: "$_id.month",
          year: "$_id.year",
          stock_name: "$_id.name",
          total_exported: 1
        }
      },

      // Sort by name and year
      { $sort: { "_id.name": 1, "_id.year": 1 } }
    ]);
    
      return res.json(result);
  } catch (error) {
      res.status(500).send(error.message)
  }
});

router.post('/report_most_export', auth, async (req, res) => {
  const {user_id,range = 400} = req.body

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (range * 24 * 60 * 60 * 1000));

  console.log(startDate)
  let matchQuery = {
      type: 2 ,
      create_date: { $gte: startDate, $lte: endDate }, // Only consider invoices within the date range
      status:2,
  }
  try {
    if(user_id) matchQuery.user =  mongoose.Types.ObjectId(user_id)
    const result = await Invoice.aggregate([
      {
        $match: matchQuery
      },
      {
        $unwind: "$list"
      },
      {
        $group: {
          _id: {
            month: { $month: "$create_date" },
            year: { $year: "$create_date" },
            stock_name: "$list.name"
          },
          total_exported: { $sum: "$list.amount" }
        }
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1, total_exported: -1 }
      },
      {
        $group: {
          _id: {
            month: "$_id.month",
            year: "$_id.year"
          },
          top_stock: { $first: "$_id.stock_name" },
          total_exported: { $first: "$total_exported" }
        }
      },
      {
        $lookup: {
          from: "stocks",
          localField: "top_stock",
          foreignField: "name",
          as: "stock"
        }
      },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          year: "$_id.year",
          stock_id: { $arrayElemAt: ["$stock._id", 0] },
          stock_name: "$top_stock",
          total_exported: 1
        }
      },
      {
        $sort: { year: -1, month: -1 }
      }
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
        $lookup: {
          from: "zone",
          localField: "zone",
          foreignField: "zone",
          as: "zone"
        }
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
    return res.json(result);
  } catch (error) {
    
    res.status(500).send(error.message)
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
router.get('/report_diff_history',async (req,res)=> {
  const { } = req.body;
  try {
    const month1 = 3;
    const month2 = 4;
    
    // filter the documents for each month and convert to sets
    const docs1 = await StocksHistory.find({ history: "642566104397df6b6a910c8f" });
    const docs2 = await StocksHistory.find({ history: "642aa3e99e70e0c985b4396e" });
    let array_added = []
    let array_old_added = []
    for (let i = 0; i < docs2.length; i++) {
      const stk = docs2[i];
       console.log(stk.stock)
      for (let j = 0; j < docs1.length; j++) {
        const stk_old = docs1[j];
        console.log(j)
        if(stk.stock.toString() === stk_old.stock.toString()){
      
          
        }
        else{

          console.log("vv===vv")
          console.log(stk_old.stock)
          array_added.push(stk)
          break
        }
      }
    }

    console.log(array_old_added.length)
    console.log(array_added.length)

    // console.log('Removed:', removed.length);
    // console.log('Changed:', changed.length);
    return res.status(400).send({
    
      // removed:removed,
      // changed:changed
    })

  }catch(err){
      console.log(err.message);
      res.status(500).send(err.message)
  }
})

router.get('/get_report_from_date', async (req, res) => {
  const { fromDate, toDate } = req.body; // Assuming you receive the fromDate and toDate from the request body

  try {
    // Get data from invoices collection within the specified date range
    
    const invoices = await Invoice.find()
      .populate('import_stock_list.stock', 'current_amount')
      .populate('export_list.stock', 'current_amount');

    // Process the invoices to calculate stock availability and movement
    const reportData = invoices.map((invoice) => {
      const incoming = invoice.import_stock_list.reduce(
        (total, item) => total + item.amount,
        0
      );
      const outgoing = invoice.export_list.reduce(
        (total, item) => total + item.amount,
        0
      );

      const stock = {
        stock: invoice.stock,
        avaliable: invoice.stock.current_amount,
        net_on_hand: invoice.stock.current_amount - outgoing + incoming,
        incoming,
        outgoing,
      };

      return stock;
    });

    return res.status(200).send(reportData);
  } catch (err) {
    console.log(err.message);
    res.status(500).send(err.message);
  }
});

router.post('/how_many_zone_user_current_use',auth, async (req, res) => {
  const { user = null } = req.body;
  try {
    const count = await Stocks.aggregate([
      {
        $match: {
          user:  mongoose.Types.ObjectId(user),
          status: 'warehouse'
        }
      },
      {
        $group: {
          _id: '$zone',
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 }
        }
      }
    ]);
    console.log(count)
    // Extract the count of unique zones
    const zoneCount = count.length > 0 ? count[0].total : 0;

    res.status(200).json({ zoneCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/stock_on_hands', auth, async (req, res) => {
  try {
    const {start_date = null ,end_date = null,user=null} = req.body
    const currentDate = new Date()
    const range = 30;
    const startDate = start_date ? new Date(start_date) :new Date(currentDate.getTime() - (range - 1) * 24 * 60 * 60 * 1000) 
  
    const endDate = new Date((end_date? new Date(end_date):currentDate).getTime() + (1) * 24 * 60 * 60 * 1000);
    
    let query = 
    {
      is_active: true,
      live_date: { $lte: endDate }, // Check if live_date is less than or equal to the end date
      $or: [
        { out_date: { $gte: startDate } }, // Check if out_date is greater than the end date
        { out_date: null } // Include stocks with no out_date (still in the warehouse)
      ]
    }
    if(user){
      query.user = mongoose.Types.ObjectId(user)
    }
    console.log(query)
    const stkList = await Stocks.aggregate([
      {
        $match: query
      },
      {
        $lookup: {
          from: 'inventories',
          let: { inventoryId: '$inventory' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$inventoryId'] }
              }
            },
            {
              $lookup: {
                from: 'products',
                let: { productId: '$product' },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ['$_id', '$$productId'] }
                    }
                  }
                ],
                as: 'product'
              }
            },
            {
              $lookup: {
                from: 'invoices',
                let: { invoiceId: '$invoice' },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ['$_id', '$$invoiceId'] }
                    }
                  }
                ],
                as: 'invoice'
              }
            }
          ],
          as: 'inventoryData'
        }
      },
      { $unwind: '$inventoryData' },
      {
        $lookup: {
          from: 'zones',
          let: { zoneId: '$zone' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$zoneId'] }
              }
            }
          ],
          as: 'zoneData'
        }
      },
      {
        $group: {
          _id: '$inventoryData',
          stocks: {
            $push: {
              stock: '$$ROOT',
              zone: {
                $cond: {
                  if: { $eq: [{ $size: '$zoneData' }, 0] },
                  then: null,
                  else: { $arrayElemAt: ['$zoneData', 0] }
                }
              }
            }
          }
        }
      },
      {
        $project: {
          inventory: '$_id',
          stocks: 1,
          _id: 0,
         
        }
      },
      {
        $sort: { 'inventory.invoice.start_date': 1,'inventory.name': 1}
      }
    ]);

    const listTaskOf = await Stocks.find(query)
    const taskList = await StockTask.find({
      start_date: { $gte: startDate }, 
      stock:{
        $in:listTaskOf
      }
    }).populate('move').populate('invoice');

    console.log(taskList.length)
    // const count = await Stocks.aggregate([
    //   {
    //     $match: query
    //   },
    //   {
    //     $group: {
    //       _id: '$zone'
    //     }
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       total: { $sum: 1 }
    //     }
    //   }
    // ]);
    
    res.json({
      on_hands: stkList,
      task: taskList,
      // usage: count[0]?.total || 0
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
router.post('/stock_on_hands_2', auth, async (req, res) => {
  try {
    const { start_date = null, end_date = null, user = null } = req.body;
    const currentDate = new Date();
    const range = 30;

    const startDate = start_date ? new Date(start_date) : new Date(currentDate.getTime() - (range - 1) * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date) : currentDate;

    let query = {
      is_active: true,
      live_date: { $lte: endDate },
      $or: [
        { out_date: { $gte: startDate } },
        { out_date: null }
      ]
    };

    if (user) {
      query.user = mongoose.Types.ObjectId(user);
    }

    const stocks = await Stocks.find(query);

    const inventoryIds = stocks.map(stock => stock.inventory);
    const inventories = await Inventory.find({ _id: { $in: inventoryIds } });

    const productIds = inventories.map(inventory => inventory.product);
    const products = await Product.find({ _id: { $in: productIds } });

    const invoiceIds = inventories.map(inventory => inventory.invoice);
    const invoices = await Invoice.find({ _id: { $in: invoiceIds } });

    const zoneIds = stocks.map(stock => stock.zone);
    const zones = await Zone.find({ _id: { $in: zoneIds } });

    const stkList = stocks.map(stock => {
      const inventory = inventories.find(inventory => inventory._id.equals(stock.inventory));
      const product = products.find(product => product._id.equals(inventory.product));
      const invoice = invoices.find(invoice => invoice._id.equals(inventory.invoice));
      const zone = zones.find(zone => zone._id.equals(stock.zone));

      return {
        inventory,
        product,
        invoice,
        stocks: [
          {
            stock,
            zone: zone || null
          }
        ]
      };
    });

    const taskList = await StockTask.find({
      start_date: { $gte: startDate },
    }).populate('move').populate('invoice');;

    res.json({
      on_hands: stkList,
      task: taskList
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 
