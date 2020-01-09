const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
require('dotenv').config({path: path.join(__dirname, ".env")});
const config = require('./config/app_config');
const logger = require('morgan');
const app = express();
require("./initialization/initialize")();

//Port Number
const port = config.APP.PORT;

app.use(logger('dev'));

// CORS middleware
app.use(cors());


//Set static folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'uploads'))); // to serve file objects in public

//Body Parser Middleware
app.use(bodyParser.json({limit: '20mb'}));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: false }));

//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

require('./config/passport')(passport);

const userRoutes = require('./routes/user_controller');
const ledgerRoutes = require('./routes/ledger_controller');
const downloadLogRoutes = require('./routes/download_log_controller');

const routes = require("./routes");

app.use('/users', userRoutes);
app.use('/ledger', ledgerRoutes);
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
	return res.status(400).send({
	  success : false,
	  message: err.message,
	  error: "Something went wrong!"
	});
  });

app.listen(port, () => {
	console.log('server started on port ' + port);
})
