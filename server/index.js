import express from 'express';
import cors from 'cors';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createObjectCsvWriter } from 'csv-writer';
import { scrapeLinkedInProfile } from './scraper.js';
import { generateSummary } from './ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// In-memory storage for jobs
const jobs = new Map();

// Helper function to generate job ID
function generateJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Upload CSV endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const jobId = generateJobId();
    const filePath = req.file.path;
    
    // Parse CSV file
    const profiles = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        if (row.linkedin_url) {
          profiles.push({
            name: row.name || '',
            linkedin_url: row.linkedin_url.trim()
          });
        }
      })
      .on('end', () => {
        // Create job
        const job = {
          jobId,
          status: 'pending',
          totalProfiles: profiles.length,
          processedProfiles: 0,
          successfulProfiles: 0,
          failedProfiles: 0,
          profiles,
          results: [],
          startedAt: new Date().toISOString(),
          errors: []
        };
        
        jobs.set(jobId, job);
        
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        
        res.json({ jobId, totalProfiles: profiles.length });
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        res.status(500).json({ error: 'Failed to parse CSV file' });
      });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Start scraping job
app.post('/api/scrape', async (req, res) => {
  try {
    const { jobId } = req.body;
    const job = jobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    job.status = 'running';
    jobs.set(jobId, job);
    
    // Start scraping process (non-blocking)
    processScrapingJob(jobId);
    
    res.json(job);
  } catch (error) {
    console.error('Scraping start error:', error);
    res.status(500).json({ error: 'Failed to start scraping' });
  }
});

// Get job status
app.get('/api/scrape/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
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

// Process scraping job
async function processScrapingJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;
  
  try {
    for (let i = 0; i < job.profiles.length; i++) {
      const profile = job.profiles[i];
      job.currentProfile = profile.name || profile.linkedin_url;
      jobs.set(jobId, job);
      
      try {
        console.log(`Scraping profile ${i + 1}/${job.profiles.length}: ${profile.linkedin_url}`);
        
        // Scrape LinkedIn profile
        const scrapedData = await scrapeLinkedInProfile(profile.linkedin_url);
        
        // Generate AI summary if we have data
        let summary = '';
        if (scrapedData.about) {
          try {
            summary = await generateSummary(scrapedData.about);
          } catch (aiError) {
            console.error('AI summary error:', aiError);
            summary = scrapedData.about.substring(0, 200) + '...';
          }
        }
        
        const result = {
          id: `alumni_${Date.now()}_${i}`,
          name: scrapedData.name || profile.name || 'Unknown',
          title: scrapedData.title || '',
          company: scrapedData.company || '',
          location: scrapedData.location || '',
          education: scrapedData.education || [],
          summary: summary || 'No summary available',
          linkedinUrl: profile.linkedin_url,
          pastRoles: scrapedData.pastRoles || [],
          scrapedAt: new Date().toISOString(),
          status: 'success'
        };
        
        job.results.push(result);
        job.successfulProfiles++;
        
      } catch (error) {
        console.error(`Error scraping ${profile.linkedin_url}:`, error);
        
        const result = {
          id: `alumni_${Date.now()}_${i}`,
          name: profile.name || 'Unknown',
          title: '',
          company: '',
          location: '',
          education: [],
          summary: '',
          linkedinUrl: profile.linkedin_url,
          pastRoles: [],
          scrapedAt: new Date().toISOString(),
          status: 'failed',
          error: error.message
        };
        
        job.results.push(result);
        job.failedProfiles++;
        job.errors.push(`${profile.linkedin_url}: ${error.message}`);
      }
      
      job.processedProfiles++;
      jobs.set(jobId, job);
      
      // Add delay between requests to be respectful
      if (i < job.profiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    job.currentProfile = undefined;
    jobs.set(jobId, job);
    
    console.log(`Job ${jobId} completed. Successful: ${job.successfulProfiles}, Failed: ${job.failedProfiles}`);
    
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    job.status = 'failed';
    job.errors.push(`Job failed: ${error.message}`);
    jobs.set(jobId, job);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});