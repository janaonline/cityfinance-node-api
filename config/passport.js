const User = require('../models/User');
const config = require('./app_config');

const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt

// const User = require('../models/user')

module.exports = function (passport) {
	var opts = {};
	opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('JWT');
	opts.secretOrKey = config.JWT.SECRET;

	passport.use(new JwtStrategy(opts, (jwt_payload, done) => {

		User.getUserById(jwt_payload.data._id, (err, user) => {
			if (err) {
				return done(err, false)
			}
			if (user) {
				return done(null, user);
			} else {
				return done(null, false);
			}
		});

	}))

	passport.serializeUser(function (user, done) {
		done(null, user.id);
	})
}
