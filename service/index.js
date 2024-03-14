const moment = require('moment');
const email = require('./email');

const bcrypt = require('bcryptjs');
const find = function (condition = {}, schema, callback) {
  // PUT Function where find condition and schema name would be received and accordingly response will be returned
  schema.find(condition).exec((err, data) => {
    if (err) {
      console.log('error occurred in get', schema, err);
      let obj = {
        timestamp: moment().unix(),
        success: false,
        message: 'DB Error Occured',
        err: err
      };
      return callback(null, obj);
    } else {
      let obj = {
        timestamp: moment().unix(),
        success: true,
        message: 'Successfully fetched',
        data: data
      };
      return callback(true, obj);
    }
  });
};

const post = function (schema, body, callback) {
  // POST Function where body would be received and accordingly response will be returned
  schema.create(body, function (err, data) {
    if (err) {
      console.log('error occurred in post', schema, err);
      let obj = {
        timestamp: moment().unix(),
        success: false,
        message: 'DB Error Occured',
        err: err
      };
      return callback(null, obj);
    } else {
      let obj = {
        timestamp: moment().unix(),
        success: true,
        message: 'Successfully created',
        data: data
      };
      return callback(true, obj);
    }
  });
};

const put = function (condition = {}, update, schema, callback) {
  // PUT Function where find condition, update condition and schema name would be received and accordingly response will be returned
  schema
    .updateOne(condition, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    })
    .exec((err, data) => {
      if (err) {
        console.log('error occurred in put', schema, err);
        let obj = {
          timestamp: moment().unix(),
          success: false,
          message: 'DB Error Occured',
          err: err
        };
        return callback(null, obj);
      } else {
        let obj = {
          timestamp: moment().unix(),
          success: true,
          message: 'Successfully updated',
          isCompleted: data.nModified || (data.upserted && data.upserted.length) ? update.isCompleted : false,
          data: data
        };
        return callback(true, obj);
      }
    });
};

const aggregate = function (condition = {}, schema, callback) {
  // PUT Function where find condition, update condition and schema name would be received and accordingly response will be returned
  schema.aggregate(condition).exec((err, data) => {
    if (err) {
      console.log('error occurred in put', schema, err);
      let obj = {
        timestamp: moment().unix(),
        success: false,
        message: 'DB Error Occured',
        err: err
      };
      return callback(null, obj);
    } else {
      let obj = {
        timestamp: moment().unix(),
        success: true,
        message: 'Successfully fetched',
        data: data
      };
      return callback(true, obj);
    }
  });
};
function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getHash(str) {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        reject(err)
      } else {
        bcrypt.hash(str, salt, (err, hash) => {
          if (err) {
            reject(err)
          } else {
            resolve(hash);
          }
        })
      }
    });
  });
}
function compareHash(str1, str2) {
  return new Promise((resolve, reject) => {
    bcrypt.compare(str1, str2, (err, isMatch) => {
      if (err) {
        reject(err)
      } else {
        resolve(isMatch);
      }
    });
  })
}

function incLoginAttempts(user) {

  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_TIME =  60 * 60 * 1000
  // if we have a previous lock that has expired, restart at 1
  if (user.lockUntil && user.lockUntil < Date.now()) {
    return updates = { $set: { loginAttempts: 1, isLocked: false, lockUntil: 0 } }
  }
  // otherwise we're incrementing
  var updates = { $inc: { loginAttempts: 1 } };
  // lock the account if we've reached max attempts and it's not locked already
  if (user.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !user.isLocked) {
    updates = { $set: { lockUntil: Date.now() + LOCK_TIME, isLocked: true } };
  }
  return updates;
};


module.exports = {
  find: find,
  put: put,
  post: post,
  aggregate: aggregate,
  sendEmail: email,
  getRndInteger: getRndInteger,
  getHash: getHash,
  compareHash: compareHash,
  incLoginAttempts: incLoginAttempts,
  response: require('./response'),
  mapFilter: require('./filter').mapFilter,
  emailTemplate: require('./email-template'),
  mapFilterNew: require('./filter').mapFilterNew,
  emailVerificationLink: require('./email-verification-link'),
  dataFormating: require('./data-fomatting'),
  checkUnique: require('./check-unique'),
  common: require('./common')
};
