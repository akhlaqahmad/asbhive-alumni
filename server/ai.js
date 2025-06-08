import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Gemini AI if API key is provided
let genAI = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

export async function generateSummary(aboutText) {
  try {
    // If Gemini API is configured, use it
    if (genAI) {
      return await generateGeminiSummary(aboutText);
    } else {
      // Fall back to mock AI service
      console.log('Using mock AI service - add GEMINI_API_KEY to .env for real AI processing');
      return await generateMockSummary(aboutText);
    }
  } catch (error) {
    console.error('AI summary generation error:', error);
    // Fall back to mock service on error
    return await generateMockSummary(aboutText);
  }
}

async function generateGeminiSummary(aboutText) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
    Analyze the following LinkedIn About section and create a professional 1-2 sentence summary that highlights the person's key expertise, industry focus, and career level. Keep it concise and under 150 characters.

    About section:
    "${aboutText}"

    Requirements:
    - Focus on their main expertise and industry
    - Mention their career level (e.g., experienced, senior, emerging)
    - Keep it professional and factual
    - Maximum 150 characters
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text().trim();
    
    // Ensure summary is not too long
    if (summary.length > 150) {
      return summary.substring(0, 147) + '...';
    }
    
    return summary;
    
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

async function generateMockSummary(aboutText) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock AI processing - in production, replace with actual API call
  if (!aboutText || aboutText.length < 10) {
    return 'Professional with experience in their field.';
  }
  
  // Simple text processing for demo
  const sentences = aboutText.split('.').filter(s => s.trim().length > 10);
  const firstSentence = sentences[0]?.trim() || aboutText.substring(0, 100);
  
  // Mock summary generation
  const summaries = [
    `Experienced professional with expertise in ${extractKeywords(aboutText).join(', ')}.`,
    `${firstSentence.substring(0, 80)}... with proven track record in their industry.`,
    `Professional with strong background in ${extractIndustryTerms(aboutText)} and leadership experience.`,
    `Accomplished individual with experience in ${extractSkills(aboutText).join(', ')} and strategic thinking.`
  ];
  
  return summaries[Math.floor(Math.random() * summaries.length)];
}

function extractKeywords(text) {
  const keywords = [
    'management', 'leadership', 'strategy', 'innovation', 'technology',
    'business development', 'operations', 'marketing', 'finance', 'consulting',
    'product management', 'project management', 'team building', 'analytics'
  ];
  
  const found = keywords.filter(keyword => 
    text.toLowerCase().includes(keyword.toLowerCase())
  );
  
  return found.length > 0 ? found.slice(0, 3) : ['business', 'professional development'];
}

function extractIndustryTerms(text) {
  const industries = [
    'technology', 'finance', 'healthcare', 'education', 'consulting',
    'manufacturing', 'retail', 'telecommunications', 'energy', 'media'
  ];
  
  const found = industries.find(industry => 
    text.toLowerCase().includes(industry.toLowerCase())
  );
  
  return found || 'business';
}

function extractSkills(text) {
  const skills = [
    'leadership', 'strategy', 'innovation', 'management', 'analysis',
    'communication', 'problem solving', 'team collaboration', 'planning'
  ];
  
  const found = skills.filter(skill => 
    text.toLowerCase().includes(skill.toLowerCase())
  );
  
  return found.length > 0 ? found.slice(0, 2) : ['leadership', 'strategy'];
}

// Export additional function for structured role extraction
export async function extractStructuredRoles(experienceText) {
  try {
    if (genAI) {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
      Extract job roles from the following experience text and return them as a JSON array. Each role should have title, company, and years (if available).

      Experience text:
      "${experienceText}"

      Return format:
      [
        {"title": "Job Title", "company": "Company Name", "years": "2020-2023"},
        {"title": "Previous Job", "company": "Previous Company", "years": "2018-2020"}
      ]

      Only return valid JSON, no additional text.
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text().trim();
      
      try {
        return JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Failed to parse Gemini JSON response:', parseError);
        return [];
      }
    } else {
      return []; // Return empty array for mock service
    }
  } catch (error) {
    console.error('Error extracting structured roles:', error);
    return [];
  }
}