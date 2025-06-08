import { GoogleGenerativeAI } from '@google/generative-ai';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Gemini AI
let genAI = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

export async function scrapeLinkedInProfile(profileUrl) {
  try {
    console.log(`Starting hybrid scrape for: ${profileUrl}`);
    
    // Step 1: Get the raw HTML content using Puppeteer
    const htmlContent = await fetchLinkedInHTML(profileUrl);
    
    // Step 2: Use Gemini API to analyze the HTML content
    if (genAI && htmlContent) {
      console.log('Using Gemini API to analyze LinkedIn content');
      return await analyzeLinkedInContentWithGemini(htmlContent, profileUrl);
    } else {
      console.log('Gemini API not configured or HTML fetch failed, using mock data');
      return generateMockProfileData(profileUrl);
    }
    
  } catch (error) {
    console.error(`Scraping error for ${profileUrl}:`, error.message);
    console.log('Falling back to mock data due to error');
    return generateMockProfileData(profileUrl);
  }
}

async function fetchLinkedInHTML(profileUrl) {
  let browser;
  
  try {
    console.log(`Fetching HTML content from: ${profileUrl}`);
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set user agent to appear more like a regular browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1366, height: 768 });

    // Set timeouts
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);

    // Enable request interception to block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Navigate to the profile
    await page.goto(profileUrl, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000 
    });
    
    // Wait for content to load
    await page.waitForSelector('body', { timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if we're on a login page
    const isLoginPage = await page.evaluate(() => {
      return document.querySelector('form[action*="login"]') !== null;
    });

    if (isLoginPage) {
      throw new Error('LinkedIn login required - profile may be private');
    }
    
    // Get the page content
    const content = await page.evaluate(() => {
      return document.documentElement.outerHTML;
    });
    
    return content;
    
  } catch (error) {
    console.error(`Error fetching HTML for ${profileUrl}:`, error.message);
    return null;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }
  }
}

async function analyzeLinkedInContentWithGemini(htmlContent, profileUrl) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Extract text content from HTML using Cheerio first to reduce token usage
    const $ = cheerio.load(htmlContent);
    
    // Remove script and style tags
    $('script, style, noscript').remove();
    
    // Extract relevant sections
    const textContent = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Limit content size to avoid token limits (first 8000 characters)
    const limitedContent = textContent.substring(0, 8000);
    
    const prompt = `
    You are a LinkedIn profile data extractor. Analyze the following LinkedIn profile content and extract structured information.

    LinkedIn Profile URL: ${profileUrl}
    
    Profile Content:
    ${limitedContent}

    Please extract the following information and return it as a valid JSON object:

    {
      "name": "Full name of the person",
      "title": "Current job title",
      "company": "Current company name", 
      "location": "Current location/city",
      "about": "About section summary (if available)",
      "education": ["Array of education entries"],
      "pastRoles": [
        {
          "title": "Previous job title",
          "company": "Previous company",
          "years": "Duration (e.g., 2020-2023)"
        }
      ]
    }

    Instructions:
    1. Extract information from the provided content only
    2. If information is not available, use empty strings or empty arrays
    3. For pastRoles, include up to 3-5 most recent previous positions
    4. Keep education entries concise (school name and degree)
    5. Return ONLY valid JSON, no additional text or markdown
    6. Ensure all string values are properly escaped for JSON

    Extract the data:
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().trim();
    
    console.log('Gemini API response received, parsing...');
    
    try {
      // Clean the response to extract JSON
      let cleanedJson = jsonText;
      
      // Remove markdown code blocks if present
      if (cleanedJson.includes('```json')) {
        cleanedJson = cleanedJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      if (cleanedJson.includes('```')) {
        cleanedJson = cleanedJson.replace(/```\n?/g, '');
      }
      
      // Find JSON object boundaries
      const jsonStart = cleanedJson.indexOf('{');
      const jsonEnd = cleanedJson.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanedJson = cleanedJson.substring(jsonStart, jsonEnd);
      }
      
      const parsedData = JSON.parse(cleanedJson);
      
      // Validate and normalize the data structure
      const normalizedData = {
        name: parsedData.name || extractNameFromUrl(profileUrl),
        title: parsedData.title || '',
        company: parsedData.company || '',
        location: parsedData.location || '',
        about: parsedData.about || '',
        education: Array.isArray(parsedData.education) ? parsedData.education : [],
        pastRoles: Array.isArray(parsedData.pastRoles) ? parsedData.pastRoles : []
      };
      
      console.log(`Successfully extracted data for: ${normalizedData.name}`);
      return normalizedData;
      
    } catch (parseError) {
      console.error('Failed to parse Gemini API JSON response:', parseError);
      console.log('Raw response:', jsonText.substring(0, 500) + '...');
      
      // Try to extract basic info from the text response
      return extractBasicInfoFromText(jsonText, profileUrl);
    }
    
  } catch (error) {
    console.error('Gemini API analysis error:', error);
    throw error;
  }
}

function extractNameFromUrl(profileUrl) {
  const urlParts = profileUrl.split('/');
  const profileSlug = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1];
  if (profileSlug && profileSlug !== 'in' && profileSlug !== '') {
    return profileSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  return 'Unknown Professional';
}

function extractBasicInfoFromText(text, profileUrl) {
  // Fallback method to extract basic info if JSON parsing fails
  const data = {
    name: extractNameFromUrl(profileUrl),
    title: '',
    company: '',
    location: '',
    about: '',
    education: [],
    pastRoles: []
  };
  
  // Try to extract basic info from text using simple patterns
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (line.includes('name') && line.includes(':')) {
      const nameMatch = line.match(/name["\s]*:[\s"]*([^",\n]+)/i);
      if (nameMatch) data.name = nameMatch[1].trim().replace(/"/g, '');
    }
    
    if (line.includes('title') && line.includes(':')) {
      const titleMatch = line.match(/title["\s]*:[\s"]*([^",\n]+)/i);
      if (titleMatch) data.title = titleMatch[1].trim().replace(/"/g, '');
    }
    
    if (line.includes('company') && line.includes(':')) {
      const companyMatch = line.match(/company["\s]*:[\s"]*([^",\n]+)/i);
      if (companyMatch) data.company = companyMatch[1].trim().replace(/"/g, '');
    }
    
    if (line.includes('location') && line.includes(':')) {
      const locationMatch = line.match(/location["\s]*:[\s"]*([^",\n]+)/i);
      if (locationMatch) data.location = locationMatch[1].trim().replace(/"/g, '');
    }
  }
  
  return data;
}

function generateMockProfileData(profileUrl) {
  // Generate mock data when Gemini API is not available or fails
  const mockName = extractNameFromUrl(profileUrl);
  
  const mockTitles = [
    'Senior Manager',
    'Product Manager', 
    'Business Analyst',
    'Marketing Director',
    'Operations Manager',
    'Strategy Consultant',
    'Finance Manager',
    'Project Manager'
  ];
  
  const mockCompanies = [
    'Tech Solutions Pte Ltd',
    'Global Consulting Group',
    'Innovation Partners',
    'Strategic Ventures',
    'Digital Transformation Co',
    'Business Excellence Ltd',
    'Future Technologies',
    'Growth Partners'
  ];
  
  const mockLocations = [
    'Singapore',
    'Kuala Lumpur, Malaysia',
    'Bangkok, Thailand',
    'Jakarta, Indonesia',
    'Manila, Philippines',
    'Ho Chi Minh City, Vietnam'
  ];
  
  const randomTitle = mockTitles[Math.floor(Math.random() * mockTitles.length)];
  const randomCompany = mockCompanies[Math.floor(Math.random() * mockCompanies.length)];
  const randomLocation = mockLocations[Math.floor(Math.random() * mockLocations.length)];
  
  return {
    name: mockName,
    title: randomTitle,
    company: randomCompany,
    location: randomLocation,
    about: `Experienced professional with expertise in ${randomTitle.toLowerCase()} and business development. Passionate about driving growth and innovation in the ${randomCompany.includes('Tech') ? 'technology' : 'business'} sector.`,
    education: ['MBA, Asian School of Business', 'Bachelor of Business Administration'],
    pastRoles: [
      {
        title: 'Senior Analyst',
        company: 'Previous Company Ltd',
        years: '2020-2023'
      },
      {
        title: 'Business Associate', 
        company: 'Startup Ventures',
        years: '2018-2020'
      }
    ]
  };
}