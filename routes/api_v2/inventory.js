
const express = require('express')
const router = express.Router();
const {check, validationResult} = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('config')
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
const Sector = require('../../models/Sector') 


router.post('/create_inventory', [auth,upload_inventories.array('images')], async (req, res) => {
    try {
        const { body } = req;
        const { files } = req;

        //console.log(req.file.path);
        //console.log(body);

        const inv = new Inventory(body);

        inv.images = files.map(file => file.location);
        inv.current_amount = inv.amount;

        await inv.save();
        res.json(inv);
    } catch(err) {
        //console.log(err.message);
        res.status(500).send(err.message);
    }
});
router.post('/update_inventory', [auth,upload_inventories.array('images')],async (req,res)=> {

    try {
        //console.log(req.files);//req.file.path
        //console.log(req.body);
        const query = req.body;
        
        // Set missing properties to null
        if(!query.exp_date){
            query.exp_date = null
        } 
        if(!query.mfg_date) {
            query.mfg_date = null
        }
        if(!query.product_code) {
            query.product_code = null
        }
        
        let inv = await Inventory.findById(query.inv_id)

        // Delete old images
        if(query.old_images){
            const difference = inv.images.filter(x => !query.old_images.includes(x))
            await Promise.all(difference.map(async (old) => {
                await delete_obj(old)
            }))
            inv.images = query.old_images
        }
        else{
            await Promise.all(inv.images.map(async (old) => {
                await delete_obj(old)
            }))
            inv.images = []
        }

        // Add new images
        if(req.files){
            await Promise.all(req.files.map(async (file) => {
                inv.images.push(file.location)
            }))
        }

        // Save the inventory object
        inv.current_amount = query.amount
        inv = await inv.save()

        // Update the inventory document in the database
        const updatedInv = await Inventory.findOneAndUpdate({_id: query.inv_id},{$set:query},{new:true, upsert: false})

        //console.log(updatedInv);
        res.json(updatedInv);
        
    }catch(err){
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/list_inventory', auth, async (req, res) => {
    const { user, search, is_in_stock, page = 1, limit = 10 } = req.body;
  
    try {
      const query = {};
      if (user !== undefined) {
        query.user = user;
      }
  
      if (is_in_stock !== undefined) {
        query.is_in_stock = is_in_stock;
      }
  
      if (search !== undefined && search !== '') {
        query.$text = { $search: search };
      }
  
      const [list, total] = await Promise.all([
        Inventory.find(query).sort({ create_date: -1 }).skip((page - 1) * limit).limit(limit),
        Inventory.countDocuments(query)
      ]);
  
      res.json({
        page,
        list,
        total
      });
    } catch (err) {
      //console.log(err.message);
      res.status(500).send(err.message);
    }
  });
  