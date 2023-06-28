var express = require('express');
var router = express.Router();
const {execSync} = require('child_process');

router.get('/generate', function(req, res, next) {
  res.render('reports/generate', { title: 'Generate Bulk Report' });
});

router.post('/generate', function(req, res, next) {
  
  console.log(req.body);
  const command = `lighthouse-batch -h --no-report ` + ((req.body.emulationMode) ? "" : '-p "--preset=desktop --disable-full-page-screenshot"') + ` -s ${req.body.urls}`;
  console.log(command);
  execSync(command);

  var summary = require('../report/lighthouse/summary.json');
  console.log(summary);



  res.render('reports/results', { title: 'Report Results', reports: summary, emulationMode: ((req.body.emulationMode) ? 'Desktop' : 'Mobile')});
});

module.exports = router;