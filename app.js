const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const mongoose = require('mongoose');
const config = require('./config/app_config');



mongoose.connect(config.DATABASE.CONNECTION_STRING);
mongoose.connection.on('connected', () => {
	console.log('connected to db ' + config.DATABASE.CONNECTION_STRING);
});

mongoose.connection.on('error', (err) => {
	console.log('error: ' + err);
});


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

app.use('/users', userRoutes);
app.use('/lookup', lookupRoutes);
app.use('/ledger', ledgerRoutes);
// app.use('/report', reportRoutes);
app.use('/logs', downloadLogRoutes);

//Index Route
app.get('/', function (req, res) {
	res.send('invalid rest point');
})

app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/index.html'));
})

app.listen(port, () => {
	console.log('server started on port ' + port);
})