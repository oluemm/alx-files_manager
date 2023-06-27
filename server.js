const express = require('express');
const router = require('./routes/index');

const PORT = process.env.PORT || 5000;
const app = express(); // app created

// make node to understand json with JSON Middleware
app.use(express.json());
// register all imported routes to the app starting at '/' i.e root path
app.use('/', router);

app.listen(PORT, () => { });

module.exports = app;
