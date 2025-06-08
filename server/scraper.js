import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export async function scrapeLinkedInProfile(profileUrl) {
  let browser;
  
  try {
    console.log(`Starting scrape for: ${profileUrl}`);
    
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
    
    // Navigate to the profile
    await page.goto(profileUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait a bit for dynamic content to load
    await page.waitForTimeout(2000);
    
    // Get the page content
    const content = await page.content();
    const $ = cheerio.load(content);
    
    // Extract data using CSS selectors
    const data = {
      name: '',
      title: '',
      company: '',
      location: '',
      about: '',
      education: [],
      pastRoles: []
    };
    
    // Extract name - try multiple selectors
    const nameSelectors = [
      'h1.text-heading-xlarge',
      '.pv-text-details__left-panel h1',
      '.ph5 h1',
      'h1[data-anonymize="person-name"]'
    ];
    
    for (const selector of nameSelectors) {
      const nameElement = $(selector).first();
      if (nameElement.length && nameElement.text().trim()) {
        data.name = nameElement.text().trim();
        break;
      }
    }
    
    // Extract current title and company
    const titleSelectors = [
      '.text-body-medium.break-words',
      '.pv-text-details__left-panel .text-body-medium',
      '.ph5 .text-body-medium'
    ];
    
    for (const selector of titleSelectors) {
      const titleElement = $(selector).first();
      if (titleElement.length && titleElement.text().trim()) {
        const titleText = titleElement.text().trim();
        
        // Try to split title and company
        if (titleText.includes(' at ')) {
          const parts = titleText.split(' at ');
          data.title = parts[0].trim();
          data.company = parts[1].trim();
        } else {
          data.title = titleText;
        }
        break;
      }
    }
    
    // Extract location
    const locationSelectors = [
      '.text-body-small.inline.t-black--light.break-words',
      '.pv-text-details__left-panel .text-body-small',
      '.ph5 .text-body-small'
    ];
    
    for (const selector of locationSelectors) {
      const locationElement = $(selector).first();
      if (locationElement.length && locationElement.text().trim()) {
        data.location = locationElement.text().trim();
        break;
      }
    }
    
    // Extract about section
    const aboutSelectors = [
      '.pv-shared-text-with-see-more .inline-show-more-text',
      '.pv-about-section .pv-about__summary-text',
      '[data-section="summary"] .inline-show-more-text'
    ];
    
    for (const selector of aboutSelectors) {
      const aboutElement = $(selector).first();
      if (aboutElement.length && aboutElement.text().trim()) {
        data.about = aboutElement.text().trim();
        break;
      }
    }
    
    // Extract education - simplified approach
    const educationElements = $('[data-section="educationsDetails"] .pvs-entity, .pv-education-section .pv-entity__summary-info');
    educationElements.each((i, element) => {
      const educationText = $(element).text().trim();
      if (educationText && educationText.length > 10) {
        data.education.push(educationText.substring(0, 200));
      }
    });
    
    // Extract experience/past roles - simplified approach
    const experienceElements = $('[data-section="experienceDetails"] .pvs-entity, .pv-experience-section .pv-entity__summary-info');
    experienceElements.each((i, element) => {
      const expText = $(element).text().trim();
      if (expText && expText.length > 10) {
        // Try to parse basic role info
        const lines = expText.split('\n').filter(line => line.trim());
        if (lines.length >= 2) {
          data.pastRoles.push({
            title: lines[0].trim(),
            company: lines[1].trim(),
            years: lines.length > 2 ? lines[2].trim() : ''
          });
        }
      }
    });
    
    console.log(`Successfully scraped: ${data.name || 'Unknown'}`);
    return data;
    
  } catch (error) {
    console.error(`Scraping error for ${profileUrl}:`, error);
    throw new Error(`Failed to scrape profile: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}