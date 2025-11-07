// server/routes/matchRoutes.js
const router = express.Router();
router.get('/match-history', (req, res) => {
  if (!req.session.authenticated) {
    return res.status(403).send('Unauthorized');
  }

  // Replace with DB query
  // server/routes/matchRoutes.js
const MatchHistory = require('../models/MatchHistory');

router.get('/match-history', async (req, res) => {
  if (!req.session.authenticated) {
    return res.status(403).send('Unauthorized');
  }

  try {
    const history = await MatchHistory.find({ userId: req.session.userId })
      .sort({ timestamp: -1 });
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


  res.json(history);
});
module.exports= router;
