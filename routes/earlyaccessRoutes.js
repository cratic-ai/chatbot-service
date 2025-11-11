const express = require('express');
const router = express.Router();
const earlyAccessController = require('../controllers/earlyaccessController');
// POST: Add a client to waitlist
router.post('/waitlist', earlyAccessController.createClient);

module.exports = router;
