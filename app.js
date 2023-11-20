const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const passport = require("passport");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const config = require("./config/app_config");
const logger = require("morgan");
const app = express();
require("./initialization/initialize")();
const Service = require("./service");
const json2xls = require("json2xls");
const expressSanitizer = require("express-sanitizer");
const verifyToken = require("./routes/auth/services/verifyToken").verifyToken;
const ExpressError = require("./util/ExpressError");
const emailCron = require('./cronjob/cron')

app.use(json2xls.middleware);
//Port Number
const port = config.APP.PORT;

app.use(logger("dev"));
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});
// CORS middleware
// app.use(cors());


// app.use(cors({
//     origin: allowedOrigins,
//     optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
// }));


const allowedOrigins = [
  // 'http://127.0.0.1:5500',
  'stage.aaina-mohua.in',
  'staging.cityfinance.in',
  'api-stage.aaina-mohua.in',
  'democityfinanceapi.dhwaniris.in',
  'democityfinance.dhwaniris.in'
];


// app.use(cors(corsOptions));
app.use((req, res, next) => {
  try{
    const host = req.headers?.host 
      if (allowedOrigins.includes(host)) {
        // Allow requests from the specified origins
       const origin = `${req.headers.origin}`;
      res.setHeader("Access-Control-Allow-Origin", origin);
      }
      // Allow specified methods
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
      // Allow specified headers
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      // Allow credentials (if needed)
      res.setHeader("Access-Control-Allow-Credentials", true);
      // Handle preflight requests
      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }
      // Move to the next middleware or route handler
      next();
  }catch(err){
    return res.json({error: err.message})
  }
});
app.use(expressSanitizer());

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "uploads")));

//app.use('/resource',express.static(path.join(__dirname, 'uploads/resource'))); // to serve file objects in public
//app.use('/objects',express.static(path.join(__dirname,'uploads/objects')));

//Body Parser Middleware
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: false }));

//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());
require("./config/passport")(passport);
require("./service/redis");

const routes = require("./routes");
// app.use(Service.response);
app.use("/api/v1/", routes);

// app.use('/objects',verifyToken,(req, res, next) => {
// 	if (!req.decoded) {
// 	    return res.status(403).end('Access Forbidden')
// 	}
//   	next()
// })

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  return res.status(404).json({
    success: false,
    message: "Page not found!",
  });
});
app.use(function (err, req, res) {
  return res.status(400).send({
    success: false,
    message: err.message,
    error: "Something went wrong!",
  });
});

app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong" } = err;
  res.status(statusCode).json({
    success: false,
    message: message,
  });
});

// app.listen(port, () => {
  //   console.log("server started on port " + port);
// });

module.exports = app