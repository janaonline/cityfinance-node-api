const jwt = require('jsonwebtoken');
const User = require('../models/user_model');
const Config = require('../config/app_config');


module.exports.getAll = function (req, res) {
    User.getAll({}, (err, out) => {
        if (err) {
            res.json({success: false, msg: 'Invalid Payload', data: err.toString() });
        }
        res.json({success: true, msg: 'Success', data: out });
    })
};

module.exports.update = function (req, res) {
    User.updateUser({_id: req.body._id}, req.body, (err, out) => {
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

	User.addUser(newUser, (err, user)=>{
		if(err){
			res.json({success:false, msg:'Failed to register user'});
		}else{
			res.json({success:true, msg:'User registered'})
		}
	});
};

module.exports.authenticate = function(req, res){
	User.getUserByUsername(req.body.username, (err, user)=>{
		if(err) throw err;
		if(!user){
			return res.json({success: false, msg:'User not found'});		
		}
		User.comparePassword(req.body.password, user.password, (err, isMatch)=>{
			if(err) throw err;
			if(isMatch){
				const token = jwt.sign({ data: user }, Config.JWT.SECRET, {
                    expiresIn: Config.JWT.TOKEN_EXPIRY
                });

				res.json({
					success: true,
					token: 'JWT '+token,
					user: {
						id: user._id,
						name: user.name,
						username: user.username,
						email: user.email
					}
				});
			}else{
				return res.json({success:false, msg: 'Invalid username or password'});
			}
		})
	})
}
