const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const authRoute = require('./routes/authRoute');
const imageRoute = require('./routes/imageRoute');
const biometricRoute = require('./routes/biometricRoute');
const matchRoute = require('./routes/matchRoute');
const unlockImageRoute = require('./routes/unlockImageRoute');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: 'your_session_secret',
  resave: false,
  saveUninitialized: true
}));

// Mount routes
app.use('/auth', authRoutes);
app.use('/image', imageRoutes);
app.use('/biometric', biometricRoutes);
app.use('/match', matchRoutes);
app.use('/unlock', unlockImage);

app.listen(5000, () => console.log('Server running on port 5000'));
