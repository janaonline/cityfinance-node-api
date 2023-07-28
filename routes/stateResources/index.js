const express = require('express');
const router = express.Router();

const {
    create, list
} = require("../../service/crud");

router.get('/list', list('StateResource'));
router.post('/create', create('StateResource'))

module.exports = router;