import express from 'express';
import cors from 'cors';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createObjectCsvWriter } from 'csv-writer';
import { scrapeLinkedInProfile, isValidLinkedInUrl, cleanupBrowser } from './scraper.js';
import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// In-memory storage for jobs and profiles
const jobs = new Map();
const profiles = new Map();

// Cleanup browser on server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await cleanupBrowser();
  process.exit(0);
});

// Helper function to generate job ID
function generateJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get all profiles
app.get('/api/profiles', (req, res) => {
  const profilesArray = Array.from(profiles.values());
  console.log('Serving profiles:', profilesArray.length);
  res.json(profilesArray);
});

// API endpoint to upload CSV file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', req.file);

    const filePath = req.file.path;
    const urls = await parseCSV(filePath);
    
    if (!urls || urls.length === 0) {
      return res.status(400).json({ error: 'No valid LinkedIn URLs found in the CSV file' });
    }
    
    // Create a new job
    const jobId = Date.now().toString();
    const job = {
      jobId,
      status: 'pending',
      totalProfiles: urls.length,
      processedProfiles: 0,
      successfulProfiles: 0,
      failedProfiles: 0,
      currentProfile: '',
      results: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
      errors: [],
      urls: urls // Store the URLs in the job
    };
    
    jobs.set(jobId, job);
    
    // Return the job ID without starting the scraping
    res.json({ jobId, totalProfiles: urls.length });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process the uploaded file',
      details: error.stack
    });
  }
});

// Process URLs for a job
async function processUrls(jobId) {
  const job = jobs.get(jobId);
  if (!job) {
    console.error(`Job ${jobId} not found`);
    return;
  }

  console.log(`Starting to process ${job.urls.length} URLs for job ${jobId}`);
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  job.processedProfiles = 0;
  job.successfulProfiles = 0;
  job.failedProfiles = 0;
  job.results = [];
  job.errors = [];

  try {
    for (const url of job.urls) {
      try {
        console.log(`Processing URL: ${url}`);
        job.currentProfile = url;
        job.processedProfiles++;

        if (!isValidLinkedInUrl(url)) {
          console.error(`Invalid LinkedIn URL: ${url}`);
          job.errors.push({
            url,
            error: 'Invalid LinkedIn URL'
          });
          job.failedProfiles++;
          continue;
        }

        console.log(`Scraping profile: ${url}`);
        const profile = await scrapeLinkedInProfile(url);
        console.log(`Successfully scraped profile:`, profile);

        if (profile) {
          job.results.push(profile);
          job.successfulProfiles++;
          // Store in profiles map
          profiles.set(profile.id, profile);
        } else {
          console.error(`Failed to scrape profile: ${url}`);
          job.errors.push({
            url,
            error: 'Failed to scrape profile'
          });
          job.failedProfiles++;
        }

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
        job.errors.push({
          url,
          error: error.message
        });
        job.failedProfiles++;
      }
    }

    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    console.log(`Job ${jobId} completed. Results:`, {
      total: job.totalProfiles,
      successful: job.successfulProfiles,
      failed: job.failedProfiles
    });
  } catch (error) {
    console.error(`Error in job ${jobId}:`, error);
    job.status = 'failed';
    job.completedAt = new Date().toISOString();
    job.errors.push({
      error: error.message
    });
  }
}

// API endpoint to start scraping
app.post('/api/scrape', async (req, res) => {
  try {
    const { jobId } = req.body;
    console.log(`Received scrape request for job ${jobId}`);

    if (!jobId) {
      console.error('No jobId provided');
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const job = jobs.get(jobId);
    if (!job) {
      console.error(`Job ${jobId} not found`);
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status === 'running') {
      console.error(`Job ${jobId} is already running`);
      return res.status(400).json({ error: 'Job is already running' });
    }

    if (job.status === 'completed') {
      console.error(`Job ${jobId} is already completed`);
      return res.status(400).json({ error: 'Job is already completed' });
    }

    console.log(`Starting scraping for job ${jobId}`);
    // Start processing in the background
    processUrls(jobId).catch(error => {
      console.error(`Error in background processing for job ${jobId}:`, error);
    });

    res.json({ 
      message: 'Scraping started',
      jobId,
      totalProfiles: job.totalProfiles
    });
  } catch (error) {
    console.error('Error starting scrape:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get job status
app.get('/api/job/:jobId', (req, res) => {
  const { jobId } = req.params;
  console.log(`Getting status for job ${jobId}`);
  
  const job = jobs.get(jobId);
  if (!job) {
    console.error(`Job ${jobId} not found`);
    return res.status(404).json({ error: 'Job not found' });
  }

  console.log(`Job ${jobId} status:`, job);
  res.json(job);
});

// Export data
app.post('/api/export/:format', (req, res) => {
  try {
    const { format } = req.params;
    const { data } = req.body;
    
    if (format === 'csv') {
      const csvWriter = createObjectCsvWriter({
        path: path.join(__dirname, 'temp_export.csv'),
        header: [
          { id: 'name', title: 'Name' },
          { id: 'title', title: 'Current Title' },
          { id: 'company', title: 'Current Company' },
          { id: 'location', title: 'Location' },
          { id: 'summary', title: 'AI Summary' },
          { id: 'education', title: 'Education' },
          { id: 'linkedinUrl', title: 'LinkedIn URL' },
          { id: 'scrapedAt', title: 'Scraped At' }
        ]
      });
      
      const csvData = data.map(item => ({
        ...item,
        education: item.education.join('; '),
        pastRoles: item.pastRoles.map(role => 
          `${role.title} at ${role.company} (${role.years})`
        ).join('; ')
      }));
      
      csvWriter.writeRecords(csvData).then(() => {
        res.download(path.join(__dirname, 'temp_export.csv'), 'alumni_data.csv', (err) => {
          if (!err) {
            fs.unlinkSync(path.join(__dirname, 'temp_export.csv'));
          }
        });
      });
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=alumni_data.json');
      res.send(JSON.stringify(data, null, 2));
    } else {
      res.status(400).json({ error: 'Invalid format' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasGeminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
  res.json({ 
    status: 'ok', 
    geminiConfigured: hasGeminiKey,
    message: hasGeminiKey ? 'Gemini AI enabled' : 'Using mock AI service - add GEMINI_API_KEY to enable real AI'
  });
});

// Function to parse CSV file
async function parseCSV(filePath) {
  try {
    console.log('Reading CSV file:', filePath);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log('Parsed CSV records:', records);

    // Extract LinkedIn URLs from the CSV
    const urls = records
      .map(record => {
        // Try different possible column names for LinkedIn URL
        const url = record.linkedin_url || record.linkedinUrl || record.url || record.URL || record.LinkedIn;
        return url ? url.trim() : null;
      })
      .filter(url => url && isValidLinkedInUrl(url));

    console.log('Extracted LinkedIn URLs:', urls);

    // Clean up the file after parsing
    try {
      fs.unlinkSync(filePath);
      console.log('Cleaned up CSV file');
    } catch (cleanupError) {
      console.error('Error cleaning up CSV file:', cleanupError);
    }

    return urls;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error('Failed to parse CSV file: ' + error.message);
  }
}

// Function to start the server
async function startServer() {
  try {
    // Cleanup any existing browser session
    await cleanupBrowser();
    
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try the following:`);
        console.error('1. Kill the existing process:');
        console.error(`   lsof -i :${PORT} | grep LISTEN`);
        console.error(`   kill <PID>`);
        console.error('2. Or use a different port by setting the PORT environment variable');
        process.exit(1);
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      await cleanupBrowser();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM. Shutting down server...');
      await cleanupBrowser();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();