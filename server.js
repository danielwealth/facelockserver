const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const authRoutes = require('./routes/authRoutes');
const imageRoutes = require('./routes/imageRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const matchRoutes = require('./routes/matchRoutes');
const unlockImage = require('./routes/unlockImage');

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
