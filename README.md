# ASB Alumni LinkedIn Scraper & Dashboard

A comprehensive web application for automating the collection and analysis of ASB alumni career data from public LinkedIn profiles, featuring AI-powered summarization and an intuitive dashboard interface.

## 🎯 Overview

This system helps the ASB Alumni Office maintain up-to-date alumni records by:
- Automatically scraping public LinkedIn profile data
- Using AI to generate career summaries
- Providing a searchable, filterable dashboard
- Exporting structured data for further analysis

## ✨ Features

### 📤 Smart Upload System
- Drag & drop CSV file upload
- Automatic validation and parsing
- Support for alumni name and LinkedIn URL columns

### 🕷️ Ethical LinkedIn Scraping
- Respects rate limits and LinkedIn's terms
- Only accesses public profile data
- No authentication or login required
- Built-in delays to prevent IP blocking

### 🧠 AI-Powered Analysis
- Automatic summarization of About sections
- Structured extraction of career history
- Mock AI service (ready for Gemini/OpenAI integration)

### 📊 Interactive Dashboard
- Real-time search and filtering
- Sortable columns
- Expandable detail views
- Company and location filters
- Export to CSV/JSON formats

### 🔒 Security & Ethics
- Public data only
- No stored credentials
- Rate-limited requests
- Transparent error handling

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd asb-alumni-scraper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development servers**
   
   Terminal 1 (Frontend):
   ```bash
   npm run dev
   ```
   
   Terminal 2 (Backend):
   ```bash
   npm run server
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 📁 Project Structure

```
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── UploadSection.tsx
│   │   ├── Dashboard.tsx
│   │   └── ScrapingProgress.tsx
│   ├── types/             # TypeScript definitions
│   └── App.tsx            # Main application
├── server/                # Node.js backend
│   ├── index.js          # Express server
│   ├── scraper.js        # Puppeteer scraping logic
│   └── ai.js             # AI summarization service
└── docs/                 # Project documentation
```

## 🔧 Configuration

### CSV Input Format
Your CSV file should contain these columns:
```csv
name,linkedin_url
Jane Doe,https://www.linkedin.com/in/janedoe/
John Smith,https://www.linkedin.com/in/johnsmith/
```

### Environment Variables (Optional)
Create a `.env` file for production:
```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=production
```

## 🤖 AI Integration

The system includes a mock AI service for demo purposes. To integrate with real AI services:

### Gemini API Integration
1. Get API key from Google AI Studio
2. Install the Gemini SDK:
   ```bash
   npm install @google/generative-ai
   ```
3. Update `server/ai.js` with the production code (commented in the file)

### OpenAI Integration
1. Get API key from OpenAI
2. Install OpenAI SDK:
   ```bash
   npm install openai
   ```
3. Implement OpenAI integration in `server/ai.js`

## 📊 Data Schema

### Alumni Data Structure
```json
{
  "id": "alumni_1234567890_0",
  "name": "Jane Doe",
  "title": "Product Manager",
  "company": "Google",
  "location": "Singapore",
  "education": ["MBA, ASB"],
  "summary": "Experienced PM with background in fintech...",
  "linkedinUrl": "https://www.linkedin.com/in/janedoe/",
  "pastRoles": [
    {
      "title": "Senior Analyst",
      "company": "AirAsia",
      "years": "2019-2022"
    }
  ],
  "scrapedAt": "2025-01-27T10:30:00Z",
  "status": "success"
}
```

## 🛡️ Rate Limiting & Ethics

The scraper implements several protective measures:
- 3-second delays between profile requests
- Headless browser with realistic user agent
- Graceful error handling
- Respect for robots.txt (public profiles only)
- No authentication bypass attempts

## 📈 Performance Considerations

- **Sequential Processing**: Profiles are processed one at a time to avoid rate limiting
- **Memory Management**: Large datasets are streamed rather than loaded entirely into memory
- **Error Recovery**: Failed profiles don't stop the entire job
- **Progress Tracking**: Real-time updates on scraping progress

## 🔍 Troubleshooting

### Common Issues

1. **Puppeteer Installation Issues**
   ```bash
   npm install puppeteer --unsafe-perm=true
   ```

2. **LinkedIn Blocking**
   - Reduce scraping frequency
   - Check if profiles are truly public
   - Verify user agent settings

3. **Memory Issues**
   - Limit concurrent browser instances
   - Increase Node.js memory limit:
     ```bash
     node --max-old-space-size=4096 server/index.js
     ```

## 📋 API Endpoints

### Upload CSV
```
POST /api/upload
Content-Type: multipart/form-data
Body: file (CSV)
```

### Start Scraping
```
POST /api/scrape
Content-Type: application/json
Body: { "jobId": "job_123..." }
```

### Check Status
```
GET /api/scrape/status/:jobId
```

### Export Data
```
POST /api/export/csv
POST /api/export/json
Content-Type: application/json
Body: { "data": [...] }
```

## 🎥 Demo Video

Create a demo video showing:
1. CSV file upload
2. Real-time scraping progress
3. Dashboard navigation and filtering
4. Data export functionality
5. Error handling examples

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is for educational and demonstration purposes. Please ensure compliance with LinkedIn's Terms of Service and applicable data protection regulations when using in production.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the GitHub issues
3. Contact the development team

---

**Built for ASB Alumni Office** | **Hackathon Project 2025**