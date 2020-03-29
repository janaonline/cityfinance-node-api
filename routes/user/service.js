const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Config = require('../../config/app_config');
const bcrypt = require('bcryptjs');

module.exports.getAll = function (req, res) {
    User.find({}, (err, out) => {
        if (err) {
            res.json({success: false, msg: 'Invalid Payload', data: err.toString() });
        }
        res.json({success: true, msg: 'Success', data: out });
    })
};

module.exports.update = function (req, res) {
    User.updateOne({_id: req.body._id}, req.body, (err, out) => {
        if (err) {
            res.json({success: false, msg: 'Invalid Payload', data: err.toString() });
        }
        res.json({success: true, msg: 'Success', data: out });
    })
};

module.exports.register = function(req, res){
    let newUser = new User({
        name: req.body.name,
        username: req.body.email,
        password: req.body.password,
        mobile: req.body.mobile,
        role: req.body.role
    });
    bcrypt.genSalt(10, (err, salt)=>{
        bcrypt.hash(newUser.password, salt, (err, hash) =>{
            if(err){
                res.json({success:false, msg:'Failed to register user'});
            }else{
                newUser.password = hash;
                newUser.save((err, user)=>{
                    if(err){
                        res.json({success:false, msg:'Failed to register user'});
                    }else{
                        res.json({success:true, msg:'User registered'})
                    }
                });
            }
        });
    });
};

module.exports.authenticate = function(req, res){
    User.findOne({username: req.body.username}, (err, user)=>{
        if(err){
            return res.json({success: false, msg:'Db Error'});
        }else if(!user){
            return res.json({success: false, msg:'User not found'});
        }else {
            bcrypt.compare(req.body.password, user.password, (err, isMatch) => {
                if (err) {
                    return res.json({success: false, msg: 'Erorr while comparing password.'});
                }else if (isMatch) {
                    const token = jwt.sign({data: user}, Config.JWT.SECRET, {
                        expiresIn: Config.JWT.TOKEN_EXPIRY
                    });

                    res.json({
                        success: true,
                        token: 'JWT ' + token,
                        user: {
                            id: user._id,
                            name: user.name,
                            username: user.username,
                            email: user.email
                        }
                    });
                } else {
                    return res.json({success: false, msg: 'Invalid username or password'});
                }
            });
        }
    })
}
