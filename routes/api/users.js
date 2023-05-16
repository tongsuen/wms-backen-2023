const express = require('express')
const router = express.Router();
const {check, validationResult} = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('config')
const auth =require('../../middleware/auth')
const {upload_avatar} = require('../../s3')
const User = require('../../models/User')
const Category = require('../../models/Category')

router.post('/create_category', auth,async (req,res)=> {
    const {name} = req.body;
    try {
        const user = await User.findById(req.user.id).select('-password');
        const cat = new Category({name,user});
        await cat.save()
        res.json(cat)

    }catch(err){
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/get_user', auth,async (req,res)=> {
    const {name} = req.body;
    try {
        const user = await User.findById(req.user.id).select('-password');

        res.json(user)

    }catch(err){
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/get_user_by_email', auth,async (req,res)=> {
    const {email} = req.body;
    try {
        const user = await User.findOne({email:email}).select('-password');

        res.json(user)

    }catch(err){
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/update_user', auth,async (req,res)=> {
    const {_id,name,last_name,user_name,admin,position,address,province,passcode
    ,company,personal_id,website,tel,tel_2,fax,role,is_person,is_active} = req.body;

    try {
        //console.log(req.body);
        
        // const user = await User.findOneAndUpdate({_id:req.user.id},{name,last_name,user_name,admin,position,address,province,passcode
        //     ,company,personal_id,website,tel,tel_2,fax,role,is_person,is_active})

        User.findOneAndUpdate({_id: _id}, {name,last_name,user_name,admin,position,address,province,passcode
            ,company,personal_id,website,tel,tel_2,fax,role,is_person,is_active}, {}, function(err, user){  
            if(err){
               return res.status(500);
            } else {
                res.json(user)
            }
           });
       

    }catch(err){
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/update_profile',[auth,upload_avatar.single('avatar')], auth,async (req,res)=> {
    const {user_id,name,last_name,user_name,admin,position,address,province,passcode
    ,company,personal_id,website,tel,tel_2,fax,role,is_person,is_active} = req.body;

    try {
        let update_body  =  {name,last_name,user_name,admin,position,address,province,passcode
            ,company,personal_id,website,tel,tel_2,fax,role,is_person,is_active}
        if(req.file){
            update_body.avatar = req.file.location;
         
        }
        // const user = await User.findOneAndUpdate({_id:req.user.id},{name,last_name,user_name,admin,position,address,province,passcode
        //     ,company,personal_id,website,tel,tel_2,fax,role,is_person,is_active})

        //console.log(update_body);
        User.findOneAndUpdate({_id: user_id},update_body, {}, function(err, user){  
            if(err){
               return res.status(500);
            } else {
                return res.json(user)
            }
           });
       

    }catch(err){
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})

router.post('/upload_avatar',[auth,upload_avatar.single('avatar')],async (req,res)=> {
    const {user_id} = req.body;
    try {
        //console.log(req.file)
        //console.log(req.body)
        const user = await User.findOne({_id:user_id})
        //console.log(user);
        
        if(req.file){
            user.avatar = req.file.location;
            user.save();
        }
        return res.json(user)
    }catch(err){
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})
router.post('/save_expo_token', auth,async (req,res)=> {
    try {
        const {expo_token} = req.body;
        //console.log(req.body)
        const user = await User.findById(req.user.id);
        user.expo_token = expo_token
        await user.save()
        res.json(user)

    }catch(err){
        //console.log(err.message);
        res.status(500).send(err.message)
    }
})
module.exports = router;