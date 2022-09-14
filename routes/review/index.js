const express = require('express');
const router = express.Router();
const Review = require('./service')
const verifyToken = require('../auth/services/verifyToken').verifyToken;


router.get('/review', verifyToken, Review.get) 

module.exports = router;

