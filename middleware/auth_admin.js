const jwt = require('jsonwebtoken');
const config  = require('config')

module.exports = function(req,res,next) {
    // get token from header
    const token = req.header('x-auth-token');
    // check if not token
    if(!token) return res.status(401).json({msg:"No token, authorization denied"});
    
    try {
        const decode = jwt.verify(token,config.get("jwtSecret"));
        if(!decoded.user.admin) return res.status(401).json({msg:'This Token, not for admin'});
        req.user = decode.user;
        
        next();
    }catch(err){
        console.log(err);
        
        res.status(401).json({msg:'Token is not valid'})
    }
}