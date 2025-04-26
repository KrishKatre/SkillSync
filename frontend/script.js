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
        const careers = parsedData.careers;

        const container = document.getElementById('career-results');
        container.innerHTML = ''; // Clear previous results

        careers.forEach(career => {
            const card = document.createElement('div');
            card.classList.add('career-card');
            card.innerHTML = `
                <h2>${career.career_name}</h2>
                <p><strong>Description:</strong> ${career.description}</p>

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
                <button class="cover-letter-button" data-career-index="${careers.indexOf(career)}">Generate Cover Letter</button>
                <div id="cover-letter-${careers.indexOf(career)}" class="cover-letter-output"></div>
                <button class="mock-interview-button" data-career-index="${careers.indexOf(career)}">Start Mock Interview</button>
                <div id="mock-interview-${careers.indexOf(career)}" class="mock-interview-output"></div>
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
                coverLetterDiv.innerHTML = `<h4>Generated Cover Letter:</h4><p>${coverLetterResult.coverLetter.replace(/\n/g, '<br>')}</p>`;
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
    container.innerHTML = `
        <div id="chat-${index}" class="chat-window">
            <div class="chat-messages" id="chat-messages-${index}"></div>
            <input type="text" id="user-input-${index}" placeholder="Type your answer..." />
            <button class="send-answer-button" id="send-answer-${index}">Send</button>
        </div>
    `;

    const chatMessages = document.getElementById(`chat-messages-${index}`);
    const userInput = document.getElementById(`user-input-${index}`);
    const sendButton = document.getElementById(`send-answer-${index}`);

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

    sendButton.addEventListener('click', async () => {
        const userAnswer = userInput.value.trim();
        if (!userAnswer) return;
        appendMessage(chatMessages, 'You', userAnswer);
        userInput.value = '';

        const nextQuestionResponse = await fetch('/continue-mock-interview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_answer: userAnswer
            })
        });

        const nextData = await nextQuestionResponse.json();
        appendMessage(chatMessages, 'Interviewer', nextData.question);
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


