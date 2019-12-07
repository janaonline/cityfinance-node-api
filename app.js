const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const mongoose = require('mongoose');
const dotenv = require('dotenv').config({path: path.join(__dirname, ".env")});
const config = require('./config/app_config');
const app = express();





//Port Number
const port = config.APP.PORT;

// CORS middleware
app.use(cors());


//Set static folder
app.use(express.static(path.join(__dirname, 'public')));

//Body Parser Middleware
app.use(bodyParser.json({limit: '20mb'}));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: false }));


app.use(express.static(path.join(__dirname, 'uploads')));
 

//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

require('./config/passport')(passport);

const userRoutes = require('./routes/user_controller');
const lookupRoutes = require('./routes/lookup_controller');
const ledgerRoutes = require('./routes/ledger_controller');
const reportRoutes = require('./routes/report_controller');
const downloadLogRoutes = require('./routes/download_log_controller');

const routes = require("./routes");

app.use('/users', userRoutes);
app.use('/lookup', lookupRoutes);
app.use('/ledger', ledgerRoutes);
// app.use('/report', reportRoutes);
app.use('/logs', downloadLogRoutes);

app.use('/api/admin/v1/', routes);
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/index.html'));
})
// catch 404 and forward to error handler
app.use(function(req, res, next) {
	return res.status(404).json({
		success : false,
		message: "Page not found!"
	});
});
app.use(function(err, req, res) {
	var status = 500;
	/*return res.status(status).json({ 
	  success : false,
	  message: err.message,
	  error: "Something went wrong!"
	});*/
	return res.status(400).send({
	  success : false,
	  message: err.message,
	  error: "Something went wrong!"
	});
  });

app.listen(port, () => {
	console.log('server started on port ' + port);
})
