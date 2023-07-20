import express from 'express';
var router = express.Router();



async function runReport(url, opts = {port: 9222}) {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  opts.port = chrome.port;

  const results = await lighthouse(url, opts, null);
  await chrome.kill();
  return results;
}

router.get('/generate', function(req, res, next) {
  res.render('reports/generate', { title: 'Generate Bulk Report' });
});

/* router.get('/results', function(req, res, next) {
  res.render('reports/results', { title: 'Report Results', reports: "", emulationMode: (true ? 'Desktop' : 'Mobile')});
}); */

export {router};