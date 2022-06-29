const express = require('express');
const {getForm, 
    updateForm,
    deleteForm,
    createForm } = require('./service')
const router = express.Router();

router.get('/',getForm);
router.post('/', createForm);
router.patch('/:formId', updateForm);
router.delete('/:formId', deleteForm);

module.exports = router