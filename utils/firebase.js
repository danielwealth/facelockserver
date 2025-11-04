// server/utils/firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'your-project-id.appspot.com',
});

const bucket = admin.storage().bucket();
module.exports = bucket;
