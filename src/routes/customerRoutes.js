const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.post('/', customerController.createCustomer);
router.get('/', customerController.getAllCustomers);
router.get('/today-reminders', customerController.getTodaysReminders);
router.get('/upcoming-reminders', customerController.getUpcomingReminders);

module.exports = router;