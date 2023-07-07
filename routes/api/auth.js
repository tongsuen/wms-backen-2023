const express = require('express')
const router = express.Router();
const {check, validationResult} = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('config')
const User = require('../../models/User')
const auth =require('../../middleware/auth')
const auth_admin =require('../../middleware/auth_admin')

const {upload_avatar} = require('../../s3')
const {handleError} = require('../../utils/handleError')


router.post('/me', auth,async (req,res)=> {
    try {
        const user = await User.findById(req.user.id).select('-password');
    

        res.json(user)

    }catch(err){
            
     return res.status(500).json(handleError(err))

    }
})

router.post('/',
[
    check('email','Please include a valid email').isEmail(),
    check('password','Password is required').not().isEmpty()],
async (req,res)=> {
     const erros = validationResult(req);
     if(!erros.isEmpty()){
         return res.status(400).json({errors:erros.array()})
     }
     const {email,password} = req.body;
     try {
        let user = await User.findOne({email});
        if(!user){
            return res.status(400).json({errors:[{msg:'User not exists'}]})
        }
        const isMatch = await bcrypt.compare(password,user.password)
        if(!isMatch){
            return res.status(400).json({errors:[{msg:'Password not match'}]})
        }
        if(user.is_active === false){
            return res.status(400).json({errors:[{msg:'user disabled please contact admin'}]})

        }
        const payload = {
            user:{
                id:user.id,
                admin:user.admin
            }
        }
        jwt.sign(payload,config.get('jwtSecret'),{
            expiresIn:360000
        },(err,token)=>{
            if(err) throw err;
            res.json({token})
        });
     }catch(err){

         return res.status(500).json(handleError(err))
     }
});
router.post('/reset_password',
[    check('password','Password is required').not().isEmpty(),
    check('confirm_password','Password is required').not().isEmpty()],
async (req,res)=> {
     const erros = validationResult(req);
     if(!erros.isEmpty()){
         return res.status(400).json({errors:erros.array()})
     }
     const {confirm_password,password,token} = req.body;
     try {
        let user = await User.findOne({token});
        if(!user){
            return res.status(400).json({errors:[{msg:'User not exists'}]})
        }
        if(password !== confirm_password){
            return res.status(400).json({errors:[{msg:'Password not match'}]})
        }
        // ecrypt
        const salt = await bcrypt.genSalt(10);

        user.password = await bcrypt.hash(password,salt);
        user.token = '';

        await user.save();

        return res.json({success:1,email:user.email})
     }catch(err){
       
         return res.status(500).json(handleError(err))
     }
});


router.post('/new_password', auth_admin, async (req, res) => {
    const {user_id,new_password } = req.body;
  
    try {
      // Step 1: Verify the current password
      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
 
      // Step 2: Update the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(new_password, saltRounds);
      user.password = hashedPassword;
      await user.save();
  
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      
         return res.status(500).json(handleError(err))
    }
  });

router.post('/forget_password',
async (req,res)=> {
 
     const {email} = req.body;
     try {
        let user = await User.findOne({email});
        if(!user){
            return res.status(400).json({errors:[{msg:'User not exists'}]})
        }

         require('crypto').randomBytes(48,async function(err, buffer) {
            var token = buffer.toString('hex');
            user.token = token;
            console.log(user);
            
            await user.save();
            
            const nodemailer = require("nodemailer");

            let transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                  user: 'tongsuendev@gmail.com', // generated ethereal user
                  pass: 'ABCdef12345', // generated ethereal password
                },
              });
            let info = await transporter.sendMail({
                from: 'tongsuendev@gmail.com', // sender address
                to: user.email, // list of receivers
                subject: "Reset Password", // Subject line
                text: "Please Enter Link Below", // plain text body
                html: "<a href='http://glacial-reef-62195.herokuapp.com/reset_password/"+token+"'>reset password?</a>", // html body
            });

            console.log("Message sent: %s", info.messageId);
        });
          

        return res.json('Check your email')

     }catch(err){
       
         return res.status(500).json(handleError(err))
     }
});
router.post('/register',upload_avatar.single('avatar'),async (req,res)=> {
    const {
        name,
        email,
        password,
        user_name,
        personal_id,
        company,
        position,
        website,
        tel,
        address,
        province,
        passcode,
        tel_2,
        fax,
        admin=false,
        role=1,
    } = req.body;
    try {
        // see if user exists
        let user = await User.findOne({ email:email});
        
        
        if(user){
            return res.status(400).json('User already exist.');

        }
        // get user gravatar
        console.log(req.body)

        user = new User({
            name,
            email,
            password,
            user_name,
            personal_id,
            company,
            position,
            website,
            tel,
            address,
            province,
            passcode,
            tel_2,
            fax,
            admin,
            role
        })
        if(req.file){

            user.avatar = req.file.location;
            
        }
        console.log(req.body);
        
        // ecrypt
        const salt = await bcrypt.genSalt(10);

        user.password = await bcrypt.hash(password,salt);

        await user.save();

        const payload = {
            user:{
                id:user.id
            }
        }
        jwt.sign(
            payload,
            config.get("jwtSecret"),
            {
                expiresIn:360000
            },
            (err,token) =>{
                if(err) throw err;
                res.json({token});

            }
         );

    } catch (error) {
       
     return res.status(500).json(handleError(err))
    }
})
module.exports = router;