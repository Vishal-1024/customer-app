const express = require('express');
const app = express();
require('dotenv').config();

app.use(express.json());
app.use(express.static('src/views'));

// Routes
const customerRoutes = require('./src/routes/customerRoutes');
app.use('/api/customers', customerRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));