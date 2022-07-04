const express = require('express');
const router = express.Router();
const {createCategory, getCategory} = require('./service');

router.get('/', getCategory);
router.post('/', createCategory);

module.exports = router