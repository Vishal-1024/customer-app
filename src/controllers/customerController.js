const db = require('../models/db');

exports.createCustomer = async (req, res) => {
  try {
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
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await db.query('SELECT * FROM customers');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTodaysReminders = async (req, res) => {
  try {
    const reminders = await db.query(`
      SELECT r.type, c.name, c.expiration_date
      FROM reminders r
      JOIN customers c ON r.customer_id = c.id
      WHERE DATE(c.expiration_date) = CURDATE()
    `);
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUpcomingReminders = async (req, res) => {
  try {
    const reminders = await db.query(`
      SELECT r.type, c.name, c.expiration_date
      FROM reminders r
      JOIN customers c ON r.customer_id = c.id
      WHERE DATE(c.expiration_date) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 4 WEEK)
    `);
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};