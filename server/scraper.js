import { GoogleGenerativeAI } from '@google/generative-ai';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { generateSummary } from './ai.js';

// Load environment variables
dotenv.config();

// Initialize Gemini AI
let genAI = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// Helper function for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Global browser instance and page
let globalBrowser = null;
let globalPage = null;
let isLoggedIn = false;

// Initialize browser session
async function initializeBrowser() {
  if (globalBrowser) {
    return;
  }

  console.log('Initializing browser session...');
  globalBrowser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080',
    ]
  });

  globalPage = await globalBrowser.newPage();
  
  // Set a realistic user agent
  await globalPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  // Set viewport
  await globalPage.setViewport({ width: 1920, height: 1080 });

  // Add request interception to block unnecessary resources
  await globalPage.setRequestInterception(true);
  globalPage.on('request', (request) => {
    const resourceType = request.resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
      request.abort();
    } else {
      request.continue();
    }
  });

  // Login to LinkedIn if credentials are available
  if (process.env.LINKEDIN_EMAIL && process.env.LINKEDIN_PASSWORD && !isLoggedIn) {
    try {
      console.log('Logging in to LinkedIn...');
      await globalPage.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle0' });
      
      // Wait for the login form
      await globalPage.waitForSelector('#username', { timeout: 10000 });
      
      // Type in credentials
      await globalPage.type('#username', process.env.LINKEDIN_EMAIL);
      await globalPage.type('#password', process.env.LINKEDIN_PASSWORD);
      
      // Click the login button
      await globalPage.click('button[type="submit"]');
      
      // Wait for navigation to complete
      await globalPage.waitForNavigation({ waitUntil: 'networkidle0' });
      
      // Check if login was successful
      const loginSuccess = await globalPage.evaluate(() => {
        return !document.querySelector('.login__form');
      });
      
      if (!loginSuccess) {
        throw new Error('LinkedIn login failed');
      }
      
      isLoggedIn = true;
      console.log('LinkedIn login successful');
      await delay(2000); // Wait a bit after login
    } catch (loginError) {
      console.error('LinkedIn login error:', loginError);
      throw loginError;
    }
  }
}

// Cleanup function to close browser
export async function cleanupBrowser() {
  if (globalBrowser) {
    console.log('Closing browser session...');
    await globalBrowser.close();
    globalBrowser = null;
    globalPage = null;
    isLoggedIn = false;
  }
}

export async function scrapeLinkedInProfile(url) {
  console.log('Starting scrape for:', url);
  
  try {
    // Initialize browser if not already done
    await initializeBrowser();

    console.log('Navigating to profile page...');
    await globalPage.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Wait for the main content to load
    await globalPage.waitForSelector('main', { timeout: 30000 });
    
    // Add a small delay to ensure dynamic content loads
    await delay(2000);

    console.log('Extracting profile data...');
    
    // Extract profile data with updated selectors
    const profileData = await globalPage.evaluate(() => {
      const getText = (selector) => {
        const element = document.querySelector(selector);
        console.log(`Looking for selector: ${selector}`);
        console.log(`Found element:`, element);
        return element ? element.textContent.trim() : '';
      };

      const getList = (selector) => {
        const elements = document.querySelectorAll(selector);
        console.log(`Looking for list selector: ${selector}`);
        console.log(`Found elements:`, elements.length);
        return Array.from(elements).map(el => el.textContent.trim());
      };

      // Log the entire page HTML for debugging
      console.log('Page HTML:', document.documentElement.outerHTML);

      // Updated selectors for the new LinkedIn layout
      console.log('Extracting name...');
      const name = getText('h1.text-heading-xlarge') || 
                  getText('h1.top-card-layout__title') ||
                  getText('h1.text-heading-xlarge.break-words');
      console.log('Name found:', name);

      console.log('Extracting title...');
      const title = getText('div.text-body-medium.break-words') || 
                   getText('div.top-card-layout__headline') ||
                   getText('div.text-body-medium');
      console.log('Title found:', title);

      console.log('Extracting location...');
      const location = getText('span.text-body-small.inline.t-black--light.break-words') || 
                      getText('span.top-card__subline-item') ||
                      getText('span.text-body-small');
      console.log('Location found:', location);
      
      // About section
      console.log('Extracting about section...');
      const aboutSection = document.querySelector('div.display-flex.ph5.pv3') || 
                          document.querySelector('div.pv-shared-text-with-see-more') ||
                          document.querySelector('div.inline-show-more-text') ||
                          document.querySelector('div.pv-shared-text-with-see-more span.inline-show-more-text');
      console.log('About section found:', aboutSection);
      const about = aboutSection ? aboutSection.textContent.trim() : '';
      console.log('About text:', about);

      // Experience section
      console.log('Extracting experience section...');
      const experienceSection = document.querySelector('section.experience-section') || 
                              document.querySelector('section#experience-section') ||
                              document.querySelector('section[data-section="experience"]');
      console.log('Experience section found:', experienceSection);
      const pastRoles = [];
      if (experienceSection) {
        const roleElements = experienceSection.querySelectorAll('li.artdeco-list__item') || 
                           experienceSection.querySelectorAll('li.pv-entity__position-group-pager') ||
                           experienceSection.querySelectorAll('li.pv-entity__position-group') ||
                           experienceSection.querySelectorAll('li.pv-entity__position-group-role-item');
        console.log('Found role elements:', roleElements.length);
        roleElements.forEach((role, index) => {
          console.log(`Processing role ${index + 1}...`);
          const title = getText('h3.t-16.t-black.t-bold') || 
                       getText('h3.pv-entity__name') ||
                       getText('h3.t-18.t-black.t-normal') ||
                       getText('h3.t-16.t-black');
          const company = getText('p.pv-entity__secondary-title') || 
                         getText('p.pv-entity__company-name') ||
                         getText('p.t-14.t-black.t-normal') ||
                         getText('p.t-14.t-black');
          const years = getText('span.pv-entity__date-range span:nth-child(2)') || 
                       getText('span.pv-entity__date-range') ||
                       getText('span.t-14.t-black--light.t-normal') ||
                       getText('span.t-14.t-black--light');
          console.log(`Role ${index + 1} details:`, { title, company, years });
          if (title && company) {
            pastRoles.push({ title, company, years });
          }
        });
      }

      // Education section
      console.log('Extracting education section...');
      const educationSection = document.querySelector('section.education-section') || 
                             document.querySelector('section#education-section') ||
                             document.querySelector('section[data-section="education"]');
      console.log('Education section found:', educationSection);
      const education = [];
      if (educationSection) {
        const eduElements = educationSection.querySelectorAll('li.pv-education-entity') || 
                          educationSection.querySelectorAll('li.pv-education-entity__degree-info') ||
                          educationSection.querySelectorAll('li.pv-education-entity__degree') ||
                          educationSection.querySelectorAll('li.pv-education-entity__degree-info-item');
        console.log('Found education elements:', eduElements.length);
        eduElements.forEach((edu, index) => {
          console.log(`Processing education ${index + 1}...`);
          const school = getText('h3.pv-entity__school-name') || 
                        getText('h3.pv-entity__name') ||
                        getText('h3.t-16.t-black.t-bold') ||
                        getText('h3.t-16.t-black');
          const degree = getText('p.pv-entity__degree-name span:nth-child(2)') || 
                        getText('p.pv-entity__degree-name') ||
                        getText('p.t-14.t-black.t-normal') ||
                        getText('p.t-14.t-black');
          console.log(`Education ${index + 1} details:`, { school, degree });
          if (school) {
            education.push(`${school}${degree ? ` - ${degree}` : ''}`);
          }
        });
      }

      const result = {
        name,
        title,
        location,
        about,
        pastRoles,
        education
      };

      console.log('Final extracted data:', result);
      return result;
    });

    console.log('Raw profile data extracted:', profileData);

    // Generate AI summary if we have data
    let summary = '';
    if (profileData.about) {
      try {
        console.log('Generating AI summary from about text:', profileData.about);
        summary = await generateSummary(profileData.about);
        console.log('Generated summary:', summary);
      } catch (aiError) {
        console.error('AI summary error:', aiError);
        summary = profileData.about.substring(0, 200) + '...';
      }
    }

    // Extract current company from title if available
    let company = '';
    if (profileData.title) {
      console.log('Extracting company from title:', profileData.title);
      const titleParts = profileData.title.split(' at ');
      if (titleParts.length > 1) {
        company = titleParts[1].trim();
        console.log('Extracted company from title:', company);
      }
    }

    const result = {
      id: `alumni_${Date.now()}`,
      name: profileData.name || 'Unknown',
      title: profileData.title || '',
      company: company || profileData.pastRoles[0]?.company || '',
      location: profileData.location || '',
      education: profileData.education || [],
      summary: summary || 'No summary available',
      linkedinUrl: url,
      pastRoles: profileData.pastRoles || [],
      scrapedAt: new Date().toISOString(),
      status: 'success'
    };

    console.log('Final result object:', result);
    return result;

  } catch (error) {
    console.error('Scraping error:', error);
    return {
      id: `alumni_${Date.now()}`,
      name: 'Unknown',
      title: '',
      company: '',
      location: '',
      education: [],
      summary: '',
      linkedinUrl: url,
      pastRoles: [],
      scrapedAt: new Date().toISOString(),
      status: 'error',
      error: error.message
    };
  } finally {
    await cleanupBrowser();
  }
}

export function isValidLinkedInUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'www.linkedin.com' && 
           urlObj.pathname.startsWith('/in/') &&
           urlObj.pathname.length > 4;
  } catch {
    return false;
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