const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.post('/', customerController.createCustomer);
router.get('/', customerController.getAllCustomers);
router.get('/today-reminders', customerController.getTodaysReminders);
router.get('/upcoming-reminders', customerController.getUpcomingReminders);
router.get('/previous-reminders', customerController.getPreviousReminders);
router.get('/search', customerController.searchCustomers);
router.get('/inactive', customerController.getInactiveCustomers);
router.put('/renew/:id', customerController.renewSubscription);

module.exports = router;