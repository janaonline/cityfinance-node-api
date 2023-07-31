const express = require('express');
const router = express.Router();

const {
    createOrUpdate, list, deleteById
} = require("../../service/crud");

router.get('/list', list('StateResource'));
router.post('/createOrUpdate', createOrUpdate('StateResource'))
router.delete('/deleteById/:id', deleteById('StateResource'))

module.exports = router;