const express = require('express')
const router = express.Router();
const { ObjectId } = require('mongodb');

const auth = require('../../../middleware/auth')
const moment = require('moment')

const { upload_inboxs, upload_invoices, upload_notes, upload_inventories, delete_obj } = require('../../../s3')
const { sendMessage } = require('../../../push_noti')
const User = require('../../../models/User')
const Category = require('../../../models/Category')
const Inventory = require('../../../models/Inventory')
const Stocks = require('../../../models/Stocks')
const StocksHistory = require('../../../models/StocksHistory')
const Invoice = require('../../../models/Invoices')
const Zone = require('../../../models/Zone')
const Inbox = require('../../../models/Inbox')
const Note = require('../../../models/Notes')
const Alert = require('../../../models/Alert')
const Combine = require('../../../models/Combine')
const Notification = require('../../../models/Notification')
const AdminNotification = require('../../../models/AdminNotification')
const Location = require('../../../models/Location')

router.post('/list_stocks_by_name', auth,async (req,res)=> {
    const {user,search,status,page = 1,limit = 10,is_expire = false} = req.body;
    try {
       
        var query ={is_active:true};
        if(user!== undefined) query.user = user;
        if(status!== undefined) query.status = status;
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { lot_number: { $regex: searchRegex } },
                { name: { $regex: searchRegex } },
                { product_code: { $regex: searchRegex } },
            ];
        }
        if(is_expire){

            const expiringInventory = await Inventory.find({exp_date: {$lt: new Date() }})
            query.inventory = { $in: expiringInventory.map(item => item._id) }

        }
        //console.log(query);
        // if(search) {
        //     query.inventory = {name:{$regex : search}} ;
        // }
        const list = await Stocks.find(query).populate({path:'inventory',populate:{path:'user',model:'user'}}).populate('product').populate('zone').skip((page - 1) * limit).limit(limit)
                            .sort({create_date:-1});
        const total = await Stocks.countDocuments(query);
        ////console.log(list);
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


module.exports = router; 
