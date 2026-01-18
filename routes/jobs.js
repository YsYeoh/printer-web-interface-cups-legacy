const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth').requireAuth;
const cups = require('../utils/cups');

// List all print jobs (active and completed)
router.get('/', requireAuth, async (req, res) => {
  try {
    const printerName = req.query.printer || null;
    const jobs = await cups.listJobs(printerName);
    res.json({ success: true, jobs });
  } catch (error) {
    console.error('Error listing jobs:', error);
    res.status(500).json({ error: error.message || 'Failed to list print jobs' });
  }
});

// Get job details
router.get('/:jobId', requireAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await cups.getJobStatus(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({ success: true, job });
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: error.message || 'Failed to get job status' });
  }
});

// Cancel print job
router.delete('/:jobId', requireAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await cups.cancelJob(jobId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel job' });
  }
});

// Hold print job
router.post('/:jobId/hold', requireAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await cups.holdJob(jobId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error holding job:', error);
    res.status(500).json({ error: error.message || 'Failed to hold job' });
  }
});

// Release print job
router.post('/:jobId/release', requireAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await cups.releaseJob(jobId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error releasing job:', error);
    res.status(500).json({ error: error.message || 'Failed to release job' });
  }
});

// Get job history
router.get('/history/list', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await cups.getJobHistory(limit);
    res.json({ success: true, jobs: history });
  } catch (error) {
    console.error('Error getting job history:', error);
    res.status(500).json({ error: error.message || 'Failed to get job history' });
  }
});

module.exports = router;

