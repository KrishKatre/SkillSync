const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');

const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)); // Quick fetch import
const GEMINI_API_KEY = 'AIzaSyABBuv_SUBzLgSJVRLSf5e4b78TlEOnAT4';

const app = express();
const PORT = 3000;

// Middleware to handle uploads
const upload = multer({ dest: 'uploads/' });


app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.json()); 
let lastUploadedResume = "";
app.post('/upload', upload.single('resume'), async (req, res) => {
    console.log('Received resume:', req.file);
    console.log('Received goals:', req.body.goals);

    const goalsText = req.body.goals;
    let resumeText = "Not provided";  // (Placeholder for now; later you can add OCR)
    try {
        if (req.file) {
            const filePath = req.file.path;
            const fileBuffer = fs.readFileSync(filePath);

            if (req.file.mimetype === 'application/pdf') {
                // If it's a PDF, extract text
                const data = await pdfParse(fileBuffer);
                resumeText = data.text.trim();
                console.log('Extracted Resume Text from PDF:', resumeText);
            } else {
                // (Optional: fallback OCR for images)
                console.log('File is not a PDF, consider adding OCR fallback.');
            }
        }
    } catch (error) {
        console.error('Error processing resume file:', error);
        resumeText = "Not provided";  // fallback if anything goes wrong
    }
    lastUploadedResume = resumeText;
    const prompt = `
    You are a professional AI career coach.

    Given the user's RESUME and CAREER GOALS below:

    1. Focus primarily on the RESUME to assess the user's current skills, education, and experience.
    2. Recommend 2-3 realistic career paths that align well with the resume.
    3. For each career path:
        - Describe the career in 1-2 sentences.
        - List 3-5 existing skills or experiences from the user's resume that are most relevant.
        - Suggest 2-3 projects, certifications, or internships the user could pursue to strengthen their resume for that career path.
        - Create a 3-step learning or experience roadmap toward entry-level readiness.

    Instructions:
    - Prioritize information found in the RESUME over the GOALS text.
    - Use GOALS text only to refine advice if relevant.
    - Respond ONLY in clean JSON without any Markdown formatting, backticks, or extra text.

    The JSON structure must be:

    {
    "careers": [
        {
        "career_name": "string",
        "description": "string",
        "relevant_resume_skills": ["string", "string", "string"],
        "recommended_projects_or_certifications": ["string", "string", "string"],
        "learning_roadmap": ["string", "string", "string"]
        },
        ...
    ]
    }

    Here is the user's information:

    ---
    Resume/Background: ${resumeText}

    Career Goals / Interests: ${goalsText}
    ---

    Respond ONLY with valid JSON following the structure above.
    `;
    

    try {
        const geminiResponse = await queryGemini(prompt);
        //console.log('Full Gemini Response:', JSON.stringify(geminiResponse, null, 2));

        let outputText = "No response text found.";

        if (geminiResponse?.candidates && geminiResponse.candidates.length > 0) {
            outputText = geminiResponse.candidates[0]?.content?.parts[0]?.text || "No response text found.";
        }

        console.log('Gemini Output:', outputText);

        res.json({
            message: 'Gemini response successful!',
            geminiOutput: outputText
        });

    } catch (error) {
        console.error('Error querying Gemini:', error);
        res.status(500).json({ error: 'Failed to fetch Gemini response.' });
    }

});

app.post('/generate-cover-letter', async (req, res) => {
    const { career_name, career_description } = req.body;

    if (!lastUploadedResume || lastUploadedResume === "Not provided") {
        return res.status(400).json({ error: 'No resume uploaded yet. Please upload your resume first.' });
    }

    const coverLetterPrompt = `
You are a professional AI career assistant.

Using the following user RESUME and TARGET ROLE information, generate a personalized professional cover letter:

Resume:
${lastUploadedResume}

Target Role:
${career_name} - ${career_description}

Instructions:
- Write in a professional, enthusiastic tone.
- Highlight relevant skills or experiences from the resume.
- Keep the cover letter concise (under 300 words).
- Do not invent fake experiences or companies.

Respond ONLY with the text of the cover letter without any formatting or commentary.
`;

    try {
        const geminiResponse = await queryGemini(coverLetterPrompt);

        let outputText = "No cover letter generated.";
        if (geminiResponse?.candidates && geminiResponse.candidates.length > 0) {
            outputText = geminiResponse.candidates[0]?.content?.parts[0]?.text || "No cover letter generated.";
        }

        res.json({
            message: 'Cover letter generated successfully!',
            coverLetter: outputText
        });

    } catch (error) {
        console.error('Error generating cover letter:', error);
        res.status(500).json({ error: 'Failed to generate cover letter.' });
    }
});
let lastCareerInfo = ""; // store which career we are interviewing for

app.post('/start-mock-interview', async (req, res) => {
    const { career_name, career_description } = req.body;
    lastCareerInfo = `Career: ${career_name} - ${career_description}`;

    const interviewPrompt = `
You are a professional interviewer for the role of ${career_name}.

Start a mock technical interview based on the user's resume and the desired career path. 
Ask one question at a time. Keep it realistic, open-ended, and relevant to the role.

Do not answer yourself — only ask questions.

First, greet the user briefly, then ask the first interview question.
`;

    const geminiResponse = await queryGemini(interviewPrompt);

    let question = "No question generated.";
    if (geminiResponse?.candidates && geminiResponse.candidates.length > 0) {
        question = geminiResponse.candidates[0]?.content?.parts[0]?.text || "No question generated.";
    }

    res.json({ question });
});

app.post('/continue-mock-interview', async (req, res) => {
    const { user_answer } = req.body;

    const followUpPrompt = `
You are continuing a mock interview for the role:
${lastCareerInfo}.

The user just answered:
"${user_answer}"

Based on their answer, either ask a thoughtful follow-up question, or move to the next interview topic.

Always respond with a single new interview question only.
`;

    const geminiResponse = await queryGemini(followUpPrompt);

    let question = "No follow-up question generated.";
    if (geminiResponse?.candidates && geminiResponse.candidates.length > 0) {
        question = geminiResponse.candidates[0]?.content?.parts[0]?.text || "No follow-up question generated.";
    }

    res.json({ question });
});

async function queryGemini(prompt) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const data = await response.json();
    return data;
}



// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
