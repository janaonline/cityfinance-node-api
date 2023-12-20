const express = require("express");
const router = express.Router();
const {createHomePageContent,
    getHomePageContent,
    // updateFormRating,
    // deleteFormRating,
    } = require('./service')

router.get('/', getHomePageContent);
router.post('/', createHomePageContent);
//router.patch('/:formId', updateFormRating);
//router.delete('/:formId', deleteFormRating)

module.exports = router;