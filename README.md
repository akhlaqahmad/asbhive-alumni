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
- **Gemini AI Integration**: Real AI summarization when API key is configured
- Automatic summarization of About sections
- Structured extraction of career history
- Fallback to mock AI service for demo purposes

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
- **Gemini API Key** (optional, for real AI processing)

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

3. **Configure Environment Variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

4. **Start the development servers**
   
   Terminal 1 (Frontend):
   ```bash
   npm run dev
   ```
   
   Terminal 2 (Backend):
   ```bash
   npm run server
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 🔑 Getting a Gemini API Key

1. **Visit Google AI Studio**
   - Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account

2. **Create API Key**
   - Click "Create API Key"
   - Choose "Create API key in new project" or select existing project
   - Copy the generated API key

3. **Add to Environment**
   - Open your `.env` file
   - Replace `your_gemini_api_key_here` with your actual API key
   - Restart the server to apply changes

4. **Verify Integration**
   - Check server logs for "Gemini AI (Real)" message
   - Visit http://localhost:3001/api/health to confirm configuration

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
├── .env                  # Environment variables
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

### Environment Variables
```env
# Required for production
GEMINI_API_KEY=your_gemini_api_key_here

# Optional configurations
PORT=3001
SCRAPING_DELAY_MS=3000
MAX_CONCURRENT_BROWSERS=1
BROWSER_TIMEOUT_MS=30000
CORS_ORIGIN=http://localhost:5173
```

## 🤖 AI Integration

### Gemini AI (Recommended)
The system automatically detects if a Gemini API key is configured:

**With API Key:**
- Real AI-powered summarization
- Advanced text analysis
- Structured role extraction

**Without API Key:**
- Mock AI service for demo
- Basic text processing
- Still functional for testing

### API Usage
The AI service generates:
- Professional career summaries (1-2 sentences, <150 characters)
- Key expertise identification
- Industry and skill extraction

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
- 3-second delays between profile requests (configurable)
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

1. **"Using mock AI service" message**
   - Add your Gemini API key to `.env` file
   - Restart the server
   - Check `/api/health` endpoint

2. **Puppeteer Installation Issues**
   ```bash
   npm install puppeteer --unsafe-perm=true
   ```

3. **LinkedIn Blocking**
   - Reduce scraping frequency in `.env`
   - Check if profiles are truly public
   - Verify user agent settings

4. **Memory Issues**
   - Limit concurrent browser instances
   - Increase Node.js memory limit:
     ```bash
     node --max-old-space-size=4096 server/index.js
     ```

## 📋 API Endpoints

### Health Check
```
GET /api/health
Response: { "status": "ok", "geminiConfigured": true, "message": "..." }
```

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

## 💰 API Costs

### Gemini API Pricing
- **Free Tier**: 15 requests per minute, 1,500 requests per day
- **Paid Tier**: $0.00025 per 1K characters (input), $0.0005 per 1K characters (output)
- **Typical Cost**: ~$0.01-0.02 per alumni profile summary

### Cost Estimation
For 100 alumni profiles:
- Estimated cost: $1-2 USD
- Processing time: ~10-15 minutes (with rate limiting)

## 🎥 Demo Video

Create a demo video showing:
1. CSV file upload
2. Real-time scraping progress
3. Dashboard navigation and filtering
4. Data export functionality
5. AI summary generation
6. Error handling examples

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
2. Verify your Gemini API key configuration
3. Review the GitHub issues
4. Contact the development team

---

**Built for ASB Alumni Office** | **Hackathon Project 2025**