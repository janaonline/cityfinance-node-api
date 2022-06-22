const express = require("express");
const router = express.Router();
const {getForms, 
    createForm,
    updateForm,
    deleteForm,} = require('./service')

router.get('/', getForms);
router.post('/', createForm);
router.patch('/:formId', updateForm);
router.delete('/:formId', deleteForm)


module.exports = router;