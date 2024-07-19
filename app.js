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


const whitelist = [
  'https://stage.aaina-mohua.in',
  'https://api-stage.aaina-mohua.in',
  'https://aaina.gov.in',
  'https://api.aaina-mohua.in',
  'http://localhost:4200',
  'http://localhost:4300',
  'https://democityfinance.dhwaniris.in',
  'https://staging.cityfinance.in',
  'https://staging-jana.cityfinance.in',
  'https://uat.cityfinance.in',
  `https://${process.env.DEMO_HOST_FRONTEND}`,
  `https://${process.env.STAGING_HOST}`,
  `https://${process.env.PROD_HOST}`,
   process.env.HOSTNAME,
   `https://dev.cityfinance.in`
];

const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

app.use(cors(corsOptions));


app.use(json2xls.middleware);
//Port Number
const port = config.APP.PORT;

app.use(logger("dev"));
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