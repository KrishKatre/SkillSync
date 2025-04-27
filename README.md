# 🔮 SkillSync - Your AI Career Coach

Welcome to **SkillSync** — an AI-powered career exploration and preparation platform designed to **analyze your resume**, **recommend career paths**, **build learning plans**, **generate personalized cover letters**, and **simulate mock interviews**. 🚀


---

## 📸 Quick Demo
🎥 [Insert YouTube link here]  
*(3-min walkthrough showing functionality and tech stack)*

---

## ✨ Features

- **Career Path Recommendations**: AI suggests tailored career options based on your resume and goals.
- **Top Companies**: See top startups and big tech companies hiring for your career!
- **Skill Gap Analysis**: Find the skills you have — and the ones you need.
- **12-Week Personalized Learning Plan**: Get a detailed roadmap with courses and project ideas.
- **Cover Letter Generator**: Instantly craft customized, professional cover letters.
- **Mock Interview Simulator**: Practice real interview questions based on your background.
- **Interview Transcript Analysis**: Identify your strengths, weaknesses, and next steps for improvement.

---

## 🛠️ Tech Stack

| Frontend                   | Backend                        | AI Integration             |
|-----------------------------|---------------------------------|-----------------------------|
| HTML, CSS, JavaScript       | Node.js, Express.js, Multer     | Gemini 2.0 (Google Generative AI) |
| html2pdf.js (for PDF export) | PDF Parsing (pdf-parse library) | Custom-designed Gemini prompts |

---

## 🚀 How to Run Locally

### 1. Clone this repository

```bash
git clone https://github.com/your-username/skillsync.git
cd skillsync
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Create .env file and put your gemini API key in it

```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

### 4. Start the Server

```bash
node server/server.js
```

### 5. Open Browser and Visit http://localhost:3000
