let careers = [];
let chatHistories = {}; 
document.getElementById('upload-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData();
    const resumeFile = document.getElementById('resume').files[0];
    const goalsText = document.getElementById('goals').value;

    formData.append('resume', resumeFile);
    formData.append('goals', goalsText);

    const response = await fetch('/upload', {
        method: 'POST',
        body: formData
    });

    const result = await response.json();


    try {
        let rawOutput = result.geminiOutput.trim();

        if (rawOutput.startsWith("```")) {
            rawOutput = rawOutput.replace(/```json|```/g, '').trim();
        }

        const parsedData = JSON.parse(rawOutput);
        careers = parsedData.careers;

        const container = document.getElementById('career-results');
        container.innerHTML = ''; // Clear previous results

        careers.forEach(career => {
            const card = document.createElement('div');
            card.classList.add('career-card');
            card.innerHTML = `
                <h2>${career.career_name}</h2>
                <p><strong>Description:</strong> ${career.description}</p>
                <p><strong>Entry-Level Salary:</strong> ${career.average_salary}</p>


                <h4>Relevant Resume Skills:</h4>
                <ul>
                    ${career.relevant_resume_skills.map(skill => `<li>${skill}</li>`).join('')}
                </ul>

                <h4>Recommended Projects/Certifications:</h4>
                <ul>
                    ${career.recommended_projects_or_certifications.map(project => `<li>${project}</li>`).join('')}
                </ul>

                <h4>Learning Roadmap:</h4>
                <ol>
                    ${career.learning_roadmap.map(step => `<li>${step}</li>`).join('')}
                </ol>
                <h4>Top Companies Hiring:</h4>
                <p>${career.top_companies.join(', ')}</p>

                <button class="cover-letter-button" data-career-index="${careers.indexOf(career)}">Generate Cover Letter</button>
                <div id="cover-letter-${careers.indexOf(career)}" class="cover-letter-output"></div>
                <button class="mock-interview-button" data-career-index="${careers.indexOf(career)}">Start Mock Interview</button>
                <div id="mock-interview-${careers.indexOf(career)}" class="mock-interview-output"></div>
                <button class="analyze-skill-gap-button" data-career-index="${careers.indexOf(career)}">🔎 Analyze Skill Gap + Plan</button>

            `;
            container.appendChild(card);
        });
        document.querySelectorAll('.cover-letter-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                const index = e.target.getAttribute('data-career-index');
                const selectedCareer = careers[index];

                const coverLetterResponse = await fetch('/generate-cover-letter', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        career_name: selectedCareer.career_name,
                        career_description: selectedCareer.description,
                    })
                });

                const coverLetterResult = await coverLetterResponse.json();
                const coverLetterDiv = document.getElementById(`cover-letter-${index}`);
                coverLetterDiv.innerHTML = `
    <h4>Generated Cover Letter:</h4>
    <p id="cover-letter-text-${index}">${coverLetterResult.coverLetter.replace(/\n/g, '<br>')}</p>
    <button class="download-cover-letter-button" data-index="${index}" data-career-name="${selectedCareer.career_name}">📥 Download Cover Letter</button>`;
    const downloadButton = coverLetterDiv.querySelector('.download-cover-letter-button');
        downloadButton.addEventListener('click', (e) => {
            const index = e.target.getAttribute('data-index');
            const careerName = e.target.getAttribute('data-career-name') || 'cover_letter';
            const element = document.getElementById(`cover-letter-text-${index}`);
            
            html2pdf().from(element).set({
                margin: 10,
                filename: `cover_letter_for_${careerName.replace(/\s+/g, '_')}.pdf`,
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).save();
        });
            });
        });
        document.querySelectorAll('.mock-interview-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = e.target.getAttribute('data-career-index');
                const selectedCareer = careers[index];
                openMockInterviewChat(selectedCareer, index);
            });
        });
        

        

    } catch (error) {
        console.error('Error parsing Gemini output:', error);
        alert('Failed to generate career results.');
    }

});
async function openMockInterviewChat(selectedCareer, index) {
    const container = document.getElementById(`mock-interview-${index}`);
    const chatHistory = []; 
    chatHistories[index] = chatHistory;

    const answerRatings = { Strong: 0, Okay: 0, NeedsImprovement: 0 };


    container.innerHTML = `
        <div id="chat-${index}" class="chat-window">
            <div class="chat-messages" id="chat-messages-${index}"></div>
            <input type="text" id="user-input-${index}" placeholder="Type your answer..." />
            <button class="send-answer-button" id="send-answer-${index}">Send</button>
        </div>
        <button id="save-transcript-${index}" class="save-transcript-button">📄 Save Transcript</button>

    `;

    const chatMessages = document.getElementById(`chat-messages-${index}`);
    const userInput = document.getElementById(`user-input-${index}`);
    const sendButton = document.getElementById(`send-answer-${index}`);
    const saveButton = document.getElementById(`save-transcript-${index}`);
    saveButton.addEventListener('click', async () => {
        const transcriptText = chatHistory.map(turn => `${turn.sender}: ${turn.text}`).join('\n\n');

        const element = document.createElement('a');
        const file = new Blob([transcriptText], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `mock_interview_transcript.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        const analysisResponse = await fetch('/analyze-interview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: transcriptText })
        });
    
        const analysisData = await analysisResponse.json();
        const strengths = analysisData.strengths || [];
        const nextSteps = analysisData.next_steps || [];
    
        
        const profilePage = document.getElementById('profile-page');
        profilePage.style.display = 'block';
    
        // Fill Strengths
        const strengthsList = document.getElementById('strengths-list');
        strengthsList.innerHTML = '';
        strengthsList.innerHTML = strengths.join('<br>');
        const improvements = analysisData.improvement_areas || [];
        const improvementsList = document.getElementById('improvements-list');
        improvementsList.innerHTML = '';
        improvementsList.innerHTML = improvements.join('<br>');

        // Fill Career Next Steps
        const nextStepsList = document.getElementById('next-steps-list');
        nextStepsList.innerHTML = '';
        nextStepsList.innerHTML = nextSteps.join('<br>');
        const certifications = analysisData.certifications || [];
        const certificationsList = document.getElementById('certifications-list');
        certificationsList.innerHTML = '';
        certificationsList.innerHTML = certifications.join('<br>');

    
        const totalAnswers = answerRatings.Strong + answerRatings.Okay + answerRatings.NeedsImprovement;
        if (totalAnswers > 0) {
            const preparationScore = Math.round(
                ((answerRatings.Strong * 1.0 + answerRatings.Okay * 0.5) / totalAnswers) * 100
            );
    
            const progressContainer = document.getElementById('progress-container');
            progressContainer.style.display = 'block';

            const progressBarInner = document.getElementById('progress-bar-inner');
            const progressText = document.getElementById('progress-text');

            // Set bar width and text
            progressBarInner.style.width = `${preparationScore}%`;
            progressText.innerText = `${preparationScore}%`;

            // Change color based on score
            if (preparationScore >= 80) {
                progressBarInner.style.backgroundColor = '#4caf50'; // Green
            } else if (preparationScore >= 50) {
                progressBarInner.style.backgroundColor = '#ffc107'; // Yellow
            } else {
                progressBarInner.style.backgroundColor = '#f44336'; // Red
            }

            const progressMessage = document.getElementById('progress-message');
            if (preparationScore >= 80) {
                progressMessage.innerText = "🔥 Amazing work! You're almost ready!";
            } else if (preparationScore >= 50) {
                progressMessage.innerText = "💪 Good progress! Keep practicing.";
            } else {
                progressMessage.innerText = "🚀 Just getting started. Practice makes perfect!";
            }

            // Display and fill the Profile Page
            const profilePage = document.getElementById('profile-page');
            profilePage.style.display = 'block';

            // Fill Strengths
            const strengthsList = document.getElementById('strengths-list');
            strengthsList.innerHTML = '';

            const resumeSkills = careers[0]?.relevant_resume_skills || [];
            resumeSkills.forEach(skill => {
                const li = document.createElement('li');
                li.textContent = skill;
                strengthsList.appendChild(li);
            });

            // Fill Career Next Steps
            const nextStepsList = document.getElementById('next-steps-list');
            nextStepsList.innerHTML = '';

            const recommendedProjects = careers[0]?.recommended_projects_or_certifications || [];
            recommendedProjects.forEach(project => {
                const li = document.createElement('li');
                li.textContent = project;
                nextStepsList.appendChild(li);
            });

        } else {
            alert("No answers were rated yet. Try answering some questions first!");
        }
    });


    // Start the interview by getting the first question from Gemini
    const interviewStart = await fetch('/start-mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            career_name: selectedCareer.career_name,
            career_description: selectedCareer.description
        })
    });

    const startData = await interviewStart.json();
    appendMessage(chatMessages, 'Interviewer', startData.question);
    chatHistory.push({ sender: 'Interviewer', text: startData.question });
    sendButton.addEventListener('click', async () => {
        const userAnswer = userInput.value.trim();
        if (!userAnswer) return;
        appendMessage(chatMessages, 'You', userAnswer);
        chatHistory.push({ sender: 'You', text: userAnswer });
        userInput.value = '';

        const rateResponse = await fetch('/rate-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_answer: userAnswer
            })
        });

        const rateData = await rateResponse.json();
        const ratingText = rateData.rating;
        let feedbackEmoji = '';
        if (ratingText === 'Strong') {
            feedbackEmoji = '💪';
            answerRatings.Strong += 1;
        } else if (ratingText === 'Okay') {
            feedbackEmoji = '🤔';
            answerRatings.Okay += 1;
        } else if (ratingText === 'Needs Improvement') {
            feedbackEmoji = '⚠️';
            answerRatings.NeedsImprovement += 1;  
        }
      
        const feedbackDiv = document.createElement('div');
        feedbackDiv.classList.add('message', 'feedback-message');
        feedbackDiv.innerHTML = `
            <div class="message-text" style="background-color: #f0f0f0; color: #555; font-style: italic;">
                💬 Feedback: ${ratingText} ${feedbackEmoji}
            </div>
        `;
        chatMessages.appendChild(feedbackDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

    
        
        const typingDiv = document.createElement('div');
        typingDiv.id = `typing-${index}`;
        typingDiv.classList.add('message', 'interviewer-message');
        typingDiv.innerHTML = `
            <div class="message-icon">🧑‍💼</div>
            <div class="message-text">
                <em>Interviewer is typing...</em>
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    
      
        const nextQuestionResponse = await fetch('/continue-mock-interview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_answer: userAnswer
            })
        });
    
        const nextData = await nextQuestionResponse.json();
    
    
        const typingMessage = document.getElementById(`typing-${index}`);
        if (typingMessage) {
            typingMessage.remove();
        }
    
        
        appendMessage(chatMessages, 'Interviewer', nextData.question);
        chatHistory.push({ sender: 'Interviewer', text: nextData.question });
    });
    
}

function appendMessage(chatMessages, sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');

    if (sender === 'Interviewer') {
        messageDiv.classList.add('interviewer-message');
        messageDiv.innerHTML = `
            <div class="message-icon">🧑‍💼</div>
            <div class="message-text">
                <strong>Interviewer:</strong><br>${text}
            </div>
        `;
    } else {
        messageDiv.classList.add('user-message');
        messageDiv.innerHTML = `
            <div class="message-icon">🧑</div>
            <div class="message-text">
                <strong>You:</strong><br>${text}
            </div>
        `;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.getElementById('career-results').addEventListener('click', async (e) => {
    if (e.target.classList.contains('analyze-skill-gap-button')) {

        const index = e.target.getAttribute('data-career-index');
        const selectedCareer = careers[index];

        const response = await fetch('/analyze-gaps-and-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                career_name: selectedCareer.career_name,
                career_description: selectedCareer.description
            })
        });

        const data = await response.json();

        const skillGapSection = document.getElementById('skill-gap-section');
        skillGapSection.style.display = 'block'; // show section if hidden

        const skillGapResults = document.getElementById('skill-gap-results');
        skillGapResults.innerHTML = `
            <h3>✅ Skills You Already Have:</h3>
            <p>${data.skill_gap_analysis.skills_user_has.join(', ')}</p>

            <h3>🚧 Skills to Develop:</h3>
            <p>${data.skill_gap_analysis.skills_user_missing.join(', ')}</p>

            <h3>📅 12-Week Personalized Plan:</h3>
            <ol>
                ${Object.entries(data.learning_plan).map(([week, task]) => `<li><strong>${week}:</strong> ${task}</li>`).join('')}
            </ol>
            <button id="download-learning-plan" style="margin-top:20px;">📥 Download My Plan as PDF</button>
        `;

        // Setup Download button 
        document.getElementById('download-learning-plan').addEventListener('click', () => {
            html2pdf().from(skillGapResults).set({
                margin: 10,
                filename: 'skill_gap_learning_plan.pdf',
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).save();
        });
    }
}); 



