const db = require('../models/db');

exports.createCustomer = async (req, res) => {
  try {
    // Validate inputs
    if (!req.body.address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    if (!req.body.mobile_number || req.body.mobile_number.length !== 10) {
      return res.status(400).json({ error: 'Mobile number must be 10 digits' });
    }

    // Insert customer
    const result = await db.query(
      'INSERT INTO customers (name, start_date, expiration_date, product, address, mobile_number) VALUES (?, ?, ?, ?, ?, ?)',
      [
        req.body.name,
        req.body.start_date,
        req.body.expiration_date,
        req.body.product,
        req.body.address,
        req.body.mobile_number
      ]
    );
    const customerId = result.insertId;

    // Generate reminders
    const generateReminders = (customerId, start_date, expiration_date) => {
      const startDate = new Date(start_date);
      const expirationDate = new Date(expiration_date);
      let currentDate = new Date(startDate);
      const reminders = [];

      // Servicing reminders every 3 months
      while (currentDate < expirationDate) {
        reminders.push({
          type: 'servicing',
          reminder_date: currentDate.toISOString().split('T')[0]
        });
        currentDate.setMonth(currentDate.getMonth() + 3);
      }

      // Renewal reminder at expiration date
      reminders.push({
        type: 'expiration',
        reminder_date: expirationDate.toISOString().split('T')[0]
      });

      return reminders;
    };

    // Insert reminders
    const reminders = generateReminders(customerId, req.body.start_date, req.body.expiration_date);
    for (const reminder of reminders) {
      await db.query(
        'INSERT INTO reminders (customer_id, type, reminder_date) VALUES (?, ?, ?)',
        [customerId, reminder.type, reminder.reminder_date]
      );
    }

    res.status(201).json({ id: customerId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await db.query(`
      SELECT 
        name, 
        DATE_FORMAT(start_date, '%d/%m/%Y') AS start_date, 
        DATE_FORMAT(expiration_date, '%d/%m/%Y') AS expiration_date, 
        product, 
        address, 
        mobile_number 
      FROM customers
    `);
    res.json(customers); // Dates are now formatted strings
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTodaysReminders = async (req, res) => {
  try {
    const reminders = await db.query(`
      SELECT 
        r.type, 
        c.name, 
        DATE_FORMAT(r.reminder_date, '%d/%m/%Y') AS reminder_date
      FROM reminders r
      JOIN customers c ON r.customer_id = c.id
      WHERE DATE(r.reminder_date) = CURDATE()
    `);
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUpcomingReminders = async (req, res) => {
  try {
    const reminders = await db.query(`
      SELECT 
        r.type, 
        c.name, 
        DATE_FORMAT(r.reminder_date, '%d/%m/%Y') AS reminder_date
      FROM reminders r
      JOIN customers c ON r.customer_id = c.id
      WHERE r.reminder_date > CURDATE()
        AND r.reminder_date <= DATE_ADD(CURDATE(), INTERVAL 4 WEEK)
    `);
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPreviousReminders = async (req, res) => {
  try {
    const reminders = await db.query('SELECT * FROM previous_reminders ORDER BY processed_date DESC');
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.processDailyReminders = async () => {
  try {
    // Get today's reminders
    const todayReminders = await db.query(`
      SELECT * FROM reminders
      WHERE reminder_date = CURDATE()
    `);

    // Insert into previous_reminders
    for (const reminder of todayReminders) {
      await db.query(
        'INSERT INTO previous_reminders (customer_id, type, reminder_date) VALUES (?, ?, ?)',
        [reminder.customer_id, reminder.type, reminder.reminder_date]
      );
    }

    // Delete reminders from main table
    await db.query('DELETE FROM reminders WHERE reminder_date = CURDATE()');
  } catch (error) {
    console.error('Error processing reminders:', error);
  }
};
