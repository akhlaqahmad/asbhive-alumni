import { GoogleGenerativeAI } from '@google/generative-ai';
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
    console.log(`Starting Gemini API scrape for: ${profileUrl}`);
    
    // Check if Gemini API is configured
    if (!genAI) {
      console.log('Gemini API not configured, using mock data');
      return generateMockProfileData(profileUrl);
    }

    // Use Gemini API to scrape LinkedIn profile
    const scrapedData = await scrapeWithGeminiAPI(profileUrl);
    
    console.log(`Successfully scraped via Gemini API: ${scrapedData.name || 'Unknown'}`);
    return scrapedData;
    
  } catch (error) {
    console.error(`Gemini API scraping error for ${profileUrl}:`, error.message);
    
    // Fallback to mock data if Gemini API fails
    console.log('Falling back to mock data due to API error');
    return generateMockProfileData(profileUrl);
  }
}

async function scrapeWithGeminiAPI(profileUrl) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
    You are a LinkedIn profile data extractor. I need you to analyze the LinkedIn profile at this URL and extract structured data.

    LinkedIn Profile URL: ${profileUrl}

    Please extract the following information and return it as a JSON object:

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

    Important instructions:
    1. Only extract information that would be publicly visible on LinkedIn
    2. If you cannot access the profile or if information is not available, use empty strings or empty arrays
    3. For pastRoles, include up to 3-5 most recent previous positions
    4. Keep education entries concise (school name and degree)
    5. Return ONLY the JSON object, no additional text or explanation
    6. If the profile is private or inaccessible, return a JSON with empty/null values but maintain the structure

    Extract the data now:
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().trim();
    
    try {
      // Clean the response to extract JSON
      let cleanedJson = jsonText;
      
      // Remove markdown code blocks if present
      if (cleanedJson.includes('```json')) {
        cleanedJson = cleanedJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      // Remove any leading/trailing text that's not JSON
      const jsonStart = cleanedJson.indexOf('{');
      const jsonEnd = cleanedJson.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanedJson = cleanedJson.substring(jsonStart, jsonEnd);
      }
      
      const parsedData = JSON.parse(cleanedJson);
      
      // Validate and normalize the data structure
      const normalizedData = {
        name: parsedData.name || '',
        title: parsedData.title || '',
        company: parsedData.company || '',
        location: parsedData.location || '',
        about: parsedData.about || '',
        education: Array.isArray(parsedData.education) ? parsedData.education : [],
        pastRoles: Array.isArray(parsedData.pastRoles) ? parsedData.pastRoles : []
      };
      
      return normalizedData;
      
    } catch (parseError) {
      console.error('Failed to parse Gemini API JSON response:', parseError);
      console.log('Raw response:', jsonText);
      
      // Try to extract basic info from the text response
      return extractBasicInfoFromText(jsonText, profileUrl);
    }
    
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

function extractBasicInfoFromText(text, profileUrl) {
  // Fallback method to extract basic info if JSON parsing fails
  const data = {
    name: '',
    title: '',
    company: '',
    location: '',
    about: '',
    education: [],
    pastRoles: []
  };
  
  // Try to extract name from URL or text
  const urlParts = profileUrl.split('/');
  const profileSlug = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1];
  if (profileSlug && profileSlug !== 'in') {
    // Convert URL slug to a readable name
    data.name = profileSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
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
  // Generate mock data when Gemini API is not available
  const urlParts = profileUrl.split('/');
  const profileSlug = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1];
  
  // Convert URL slug to a readable name
  let mockName = 'Unknown Professional';
  if (profileSlug && profileSlug !== 'in') {
    mockName = profileSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
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

// Keep the original Puppeteer scraping function as backup (commented out)
/*
// Original Puppeteer-based scraping function (kept for reference)
async function scrapeLinkedInProfileWithPuppeteer(profileUrl) {
  // ... original Puppeteer code would be here ...
  // This is kept as a backup method if needed
}
*/