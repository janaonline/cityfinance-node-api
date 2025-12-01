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
const maintenanceMiddleware = require('./middlewares/maintenance.middleware');



const corsOptions = {
  origin: function (origin, callback) {
    try {
      // Load and parse domains from .env
      const rawDomains = process.env.WHITELISTED_DOMAINS || "";
      const whitelist = new Set(
        rawDomains
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
      );

      // Load regex from .env
      let allowedOriginRegex = null;
      if (process.env.WHITELISTED_DOMAINS_REGEX) {
        try {
          allowedOriginRegex = new RegExp(process.env.WHITELISTED_DOMAINS_REGEX);
        } catch (err) {
          console.error("Invalid ALLOWED_ORIGIN_REGEX in .env:", err.message);
          return callback(new Error("Invalid CORS regex"));
        }
      }

      // Allow requests with no Origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      // Main CORS access logic
      const isWhitelisted = whitelist.has(origin);
      const matchesRegex = allowedOriginRegex?.test(origin);
      if (isWhitelisted || matchesRegex) return callback(null, true);

      //  Block everything else (fail closed)
      return callback(new Error("Not allowed by CORS"));

    } catch (err) {
      console.error("Unexpected CORS error:", err);
      return callback(new Error("CORS processing error"));
    }
  },
};

app.use(cors(corsOptions));

// 🔒 Apply globally to all API routes
app.use('/api', maintenanceMiddleware);

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
const routes_v2 = require("./routes_v2");
// app.use(Service.response);
app.use("/api/v1/", routes, routes_v2);

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