const express = require("express");
const router = express.Router();
const {createFormRating,
    getFormRatings,
    updateFormRating,
    deleteFormRating,
    } = require('./service')

router.get('/', getFormRatings);
router.post('/', createFormRating);
router.patch('/:formId', updateFormRating);
router.delete('/:formId', deleteFormRating)

module.exports = router;