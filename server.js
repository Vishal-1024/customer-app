const customerController = require('./src/controllers/customerController');
const express = require('express');
const app = express();
const cron = require('node-cron');
require('dotenv').config();

const cors = require('cors');
app.use(cors());

app.use(express.json());
app.use(express.static('src/views'));

// Routes
const customerRoutes = require('./src/routes/customerRoutes');
app.use('/api/customers', customerRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
    await customerController.processDailyReminders();
    console.log('Daily reminders processed');
  });