// Mock AI service for demo purposes
// In production, you would integrate with Gemini API or OpenAI

export async function generateSummary(aboutText) {
  try {
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
    
  } catch (error) {
    console.error('AI summary generation error:', error);
    return 'Professional with diverse experience and expertise.';
  }
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

// For production use with Gemini API:
/*
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateSummary(aboutText) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
    Summarize the following LinkedIn About section into 1-2 concise sentences that highlight the person's key expertise and career focus:
    
    "${aboutText}"
    
    Keep it professional and under 150 characters.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
    
  } catch (error) {
    console.error('Gemini API error:', error);
    return 'Professional with diverse experience and expertise.';
  }
}
*/