# 🛠 Technical Features PRD: ASB Alumni Scraper System

## 📌 Objective

To define and scope the technical architecture, components, and features required to build the ASB Alumni Scraper System using **Node.js**, **Puppeteer**, and **GenAI APIs** for structured data extraction and summarization from LinkedIn public profiles.

---

## 🔧 System Architecture Overview

### 🧱 Modules

1. **Input Handler**
   - Accepts CSV file with:
     - Name (optional)
     - LinkedIn profile URL (required)
   - Validates input format
   - Parses rows into queue for processing

2. **Scraping Engine**
   - Built using Puppeteer (headless Chrome)
   - Navigates to each LinkedIn profile (public view)
   - Extracts:
     - Full Name
     - Current Title and Company
     - Past Job Roles (with Title, Company, Dates)
     - Location
     - Education
     - About section text (optional)

3. **HTML Parser**
   - Uses Cheerio to parse static DOM from Puppeteer
   - Fallback XPath/CSS selectors for missing fields
   - Cleans raw text data

4. **GenAI Parser**
   - Integrates Google Gemini or OpenAI API
   - Parses:
     - About section → Summary
     - Experience section → Structured roles
   - Implements retry/backoff for API errors

5. **Data Formatter**
   - Transforms scraped + AI-processed data into:
     - JSON structure
     - Tabular CSV format
   - Handles nested fields (e.g., roles array)

6. **Agent Logic**
   - Optional refresh mechanism:
     - Runs scrape on selected profiles periodically
     - Flags changes
   - Could be CLI flag: `--refresh` or `--compare`

7. **Output Writer**
   - Exports to:
     - `output.csv` (tabular)
     - `output.json` (structured)
   - Optional: Save individual logs or error profiles

8. **Error Handler & Logger**
   - Logs:
     - Skipped/broken URLs
     - Scraping failures
     - API timeouts
   - Outputs error.json or error.log

---

## ⚙️ Technology Stack

| Layer              | Technology            | Purpose                            |
|-------------------|------------------------|------------------------------------|
| Scraper Engine     | Puppeteer              | Dynamic web page scraping          |
| HTML Parser        | Cheerio                | DOM parsing and text extraction    |
| GenAI Integration  | Gemini API / OpenAI    | Summarizing unstructured text      |
| Backend Runtime    | Node.js                | JavaScript runtime                 |
| Data Format        | fs, csv-writer, xlsx   | File read/write operations         |
| Optional UI        | Express API / Streamlit| Trigger scraping from UI           |

---

## 🧪 Input / Output Contracts

### Input
```csv
name,linkedin_url
Jane Doe,https://www.linkedin.com/in/janedoe/
```

### Output JSON
```json
{
  "name": "Jane Doe",
  "title": "Product Manager",
  "company": "Google",
  "location": "Singapore",
  "education": ["MBA, ASB"],
  "summary": "Product leader with 5+ years experience...",
  "past_roles": [
    {"title": "Analyst", "company": "AirAsia", "years": "2019–2022"}
  ]
}
```

---

## ⏳ Performance Considerations

- Add `setTimeout` or randomized delays between page loads
- Scrape profiles in sequence (parallel batch optional with caution)
- Use Puppeteer’s stealth plugin to avoid detection
- Limit to ~1 request per 10-15 seconds

---

## 🧠 GenAI Prompt Example

```text
Given the following About section, summarize it into 1-2 lines:

"Experienced product manager with a background in fintech..."

Extract job roles from this section into JSON:
- Title
- Company
- Years
- Location
```

---

## 🔐 Security & Ethics

- Scrape only public LinkedIn URLs
- Do not store login info or cookies
- Avoid rate-limit violations
- Add disclaimer in code & README

---

## ✅ Deliverables

- Fully functional Node.js scraper with GenAI integration
- Input/output examples and error handling
- CLI command or local server trigger
- Export files + logs