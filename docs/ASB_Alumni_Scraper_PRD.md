# 📄 Product Requirements Document (PRD)

## 🔖 Project Title:
**ASB Alumni LinkedIn Scraper and Summarizer**

## 👥 Stakeholders:
- **Client:** ASB Alumni Office (Benyamin Mohd Nasir, Kimberly Aw)
- **Development Team:** BOLT
- **End Users:** ASB Alumni Office staff, Event Organizers

---

## 1. 🧩 Problem Statement

ASB currently maintains alumni data manually via Excel and ad-hoc LinkedIn checks. This leads to **outdated**, **incomplete**, and **non-scalable** alumni records. There is no centralized or self-updating system to track alumni career updates, which restricts engagement and strategic outreach.

---

## 2. 🎯 Goal

Build a **functional prototype** that automates the extraction of structured career data from public LinkedIn profiles, using a predefined list of alumni names + URLs. Output must be in structured format (CSV/JSON), and optionally use GenAI to summarize unstructured data.

---

## 3. 🛠 Key Features (MVP)

### A. Input Handler
- Upload or parse `.csv` file containing:
  - Alumni Name (optional)
  - LinkedIn Profile URL (required)

### B. LinkedIn Scraper
- Use Puppeteer to extract from **public LinkedIn pages**:
  - Full Name
  - Current Position (Job Title, Company)
  - Past Roles (Job Title, Company, Dates)
  - Location
  - Education
  - About section (optional)

### C. Structured Output
- Export results to:
  - `output.csv`
  - `output.json`
- Schema Example:
```json
{
  "name": "Jane Doe",
  "current_company": "Google",
  "title": "Product Manager",
  "location": "Singapore",
  "education": ["MBA, ASB"],
  "past_roles": [
    {"company": "AirAsia", "title": "Analyst", "years": "2019–2022"}
  ],
  "summary": "Experienced PM with a background in aviation analytics."
}
```

### D. GenAI Integration
- Use Gemini API to:
  - Summarize the “About” section
  - Parse long experience text into structured roles

### E. Agentic Behavior
- Optional CRON-like logic for periodic refresh
- Flag profiles with changes since last run

---

## 4. 🧪 Stretch Features (Bonus)

- Simple dashboard (using Streamlit or Next.js) to view results
- Self-update form mockup (Google Form + Zapier webhook)
- Change tracking/version control for updated data
- Export to Excel (`xlsx`) format
- Search/filter by company, location, cohort

---

## 5. ⚙️ Tech Stack

| Layer             | Tool                  |
|------------------|------------------------|
| Scraping         | Node.js + Puppeteer    |
| HTML Parsing     | Cheerio                |
| GenAI            | Google Gemini API      |
| Data Output      | CSV, JSON (`fs`, `csv-writer`) |
| Optional UI      | Express API or Streamlit |
| Deployment       | Manual CLI or local run |
| Repo Hosting     | GitHub                 |

---

## 6. 📋 Milestones

| Time      | Task                             |
|-----------|----------------------------------|
| Hour 1    | Setup Node project + Input parser |
| Hour 2-3  | Puppeteer scraping for test URLs  |
| Hour 4    | Output to CSV/JSON                |
| Hour 5    | Integrate Gemini API              |
| Hour 6    | Add agent logic or refresh flag   |
| Hour 7    | Create README + demo video        |
| Hour 8    | Final QA, polish, submit repo     |

---

## 7. ✅ Success Criteria

- Accurately extract data from 10–15 public LinkedIn URLs
- Output structured file (validated against manual test set)
- GenAI summarization works for at least 50% of “About” or job sections
- Team can demo tool in action (live or recorded)

---

## 8. ⚠️ Constraints

- LinkedIn scraping must only target **public profiles**
- No login/authentication scraping
- Rate-limit scraping to avoid IP bans
- 8-hour dev window

---

## 9. 📁 Deliverables

- GitHub repo with full source code
- `README.md` with:
  - Setup instructions
  - How to run scraper
  - Input/output spec
  - GenAI integration notes
- Demo video (5–10 mins)
- Output files for test input set