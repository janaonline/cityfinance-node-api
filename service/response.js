const moment = require("moment");
const BadRequest = (res,data = {},message = "",status = 400)=>{
    //let res = this;
    let resData = {
        timestamp : moment().unix(),
        success : false,
        message : message,
        errors : data
    };
    return res.status(status).json(resData);
}
const DbError = (res,data = {},message = "",status = 400)=>{
    //let res = this;
    let resData = {
        timestamp : moment().unix(),
        success : false,
        message : message,
        errors : data
    };
    return res.status(status).json(resData);
}
const InternalError = (res,data = {},message = "",status = 400)=>{
    //let res = this;
    let resData = {
        timestamp : moment().unix(),
        success : false,
        message : message,
        errors : data
    };
    return res.status(status).json(resData);
}
const OK = (res,  data = [], message = "",status = 200)=>{
  //  let res = this;
    return res.status(status).json({
        timestamp : moment().unix(),
        success : true,
        message : message,
        data : data
    });
}
const UnAuthorized = (res,data = {},message = "",status = 401)=>{
   // let res = this;
    let resData = {
        timestamp : moment().unix(),
        success : false,
        message : message,
        data : data
    };
    return res.status(status).json(resData);
}
module.exports = {
    OK:OK,
    BadRequest:BadRequest,
    UnAuthorized:UnAuthorized,
    InternalError:InternalError,
    DbError:DbError
}
/*
module.exports = (req, res, next)=>{
    res["OK"] = OK;
    res["BadRequest"] = BadRequest;
    res["UnAuthorized"] = UnAuthorized;
    res["InternalError"] = InternalError;
    res["DbError"] = DbError;
    next();
}*/
