const db = require('../models/db');

// Global function to generate reminders
function generateReminders(start_date) {
  const startDate = new Date(start_date);
  const expirationDate = new Date(startDate);
  expirationDate.setMonth(startDate.getMonth() + 12); // 12 months from start
  const reminders = [];

  // Service reminders at 0, 4, and 8 months
  const serviceMonths = [0, 4, 8];
  serviceMonths.forEach(months => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + months);
    reminders.push({
      type: 'servicing',
      reminder_date: date.toISOString().split('T')[0]
    });
  });

  // Expiration reminder at 12 months
  reminders.push({
    type: 'expiration',
    reminder_date: expirationDate.toISOString().split('T')[0]
  });

  return reminders;
}

exports.createCustomer = async (req, res) => {
  try {
    // Validate inputs
    if (!req.body.address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    if (!req.body.mobile_number || req.body.mobile_number.length !== 10) {
      return res.status(400).json({ error: 'Mobile number must be 10 digits' });
    }

    // Calculate expiration_date as start_date + 1 year
    const startDate = new Date(req.body.start_date);
    const expirationDate = new Date(startDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    const formattedExpirationDate = expirationDate.toISOString().split('T')[0];

    // Insert customer
    const result = await db.query(
      'INSERT INTO customers (name, start_date, expiration_date, product, address, mobile_number) VALUES (?, ?, ?, ?, ?, ?)',
      [
        req.body.name,
        req.body.start_date,
        formattedExpirationDate,
        req.body.product,
        req.body.address,
        req.body.mobile_number
      ]
    );
    const customerId = result.insertId;

    // Generate reminders
    const reminders = generateReminders(req.body.start_date);

    // Insert reminders
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
    res.json(customers);
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
    const reminders = await db.query(`
      SELECT 
        r.type, 
        c.name, 
        DATE_FORMAT(r.reminder_date, '%d/%m/%Y') AS reminder_date,
        r.processed_date
      FROM previous_reminders r
      JOIN customers c ON r.customer_id = c.id
      ORDER BY r.processed_date DESC
    `);
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
        'INSERT INTO previous_reminders (customer_id, type, reminder_date, processed_date) VALUES (?, ?, ?, NOW())',
        [reminder.customer_id, reminder.type, reminder.reminder_date]
      );
    }

    // Delete reminders from main table
    await db.query('DELETE FROM reminders WHERE reminder_date = CURDATE()');
  } catch (error) {
    console.error('Error processing reminders:', error);
  }
};

exports.searchCustomers = async (req, res) => {
  try {
    const searchTerm = req.query.search;
    const customers = await db.query(`
      SELECT 
        name, 
        DATE_FORMAT(start_date, '%d/%m/%Y') AS start_date, 
        DATE_FORMAT(expiration_date, '%d/%m/%Y') AS expiration_date, 
        product, 
        address, 
        mobile_number 
      FROM customers
      WHERE name LIKE ? OR mobile_number = ?
    `, [`%${searchTerm}%`, searchTerm]);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getInactiveCustomers = async (req, res) => {
  try {
    const customers = await db.query(`
      SELECT 
        id, 
        name, 
        DATE_FORMAT(expiration_date, '%d/%m/%Y') AS expiration_date
      FROM customers
      WHERE expiration_date < CURDATE()
    `);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.renewSubscription = async (req, res) => {
  try {
    const customerId = req.params.id;
    const newEndDate = new Date();
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);

    // Delete old reminders
    await db.query('DELETE FROM reminders WHERE customer_id = ?', [customerId]);

    // Generate new reminders using today's date
    const newStartDate = new Date().toISOString().split('T')[0];
    const reminders = generateReminders(newStartDate);

    // Insert new reminders
    for (const reminder of reminders) {
      await db.query(
        'INSERT INTO reminders (customer_id, type, reminder_date) VALUES (?, ?, ?)',
        [customerId, reminder.type, reminder.reminder_date]
      );
    }

    // Update customer dates
    await db.query(`
      UPDATE customers
      SET start_date = CURDATE(), expiration_date = ?
      WHERE id = ?
    `, [newEndDate.toISOString().split('T')[0], customerId]);

    res.json({ message: 'Subscription renewed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};