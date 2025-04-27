const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    alert("Your browser does not support the SpeechRecognition API. Please use Chrome or Edge.");
}

const recognition = new SpeechRecognition();
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.continuous = false;
recognition.maxAlternatives = 1;

let audioContext = null;
let analyser = null;
let microphone = null;
let javascriptNode = null;

// Add microphone icon
const micIcon = document.createElement('div');
micIcon.id = 'micIcon';
micIcon.textContent = '🎤';
document.body.insertBefore(micIcon, document.getElementById('status'));

async function setupVolumeMeter() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;

        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);

        javascriptNode.onaudioprocess = () => {
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            const average = array.reduce((a, b) => a + b) / array.length;
            const volumePercent = Math.min(100, (average / 256) * 100);
            document.getElementById("volumeLevel").style.width = `${volumePercent}%`;
        };
    } catch (err) {
        console.error("Error setting up volume meter:", err);
    }
}

function startRecognition() {
    recognition.start();
    setTimeout(() => {
        if (document.getElementById("status").textContent === "Status: Listening...") {
            recognition.stop();
        }
    }, 10000);
}

recognition.onstart = () => {
    window.speechSynthesis.cancel();
    document.getElementById("status").textContent = "Status: Listening...";
    document.getElementById("startBtn").disabled = true;
    document.getElementById("stopBtn").disabled = false;
    micIcon.classList.add('listening');
};

recognition.onresult = async (event) => {
    const transcription = event.results[0][0].transcript;
    document.getElementById("transcript").innerHTML += `<br>Response: ${transcription} 😊`;

    try {
        const response = await fetch('/submit_response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcription })
        });
        const data = await response.json();

        if (data.complete) {
            let feedbackText = "<br><br>Feedback for Your Responses 🎉:<br>";
            data.feedback.forEach((item, index) => {
                feedbackText += `<br>Question ${index + 1}: "${item.question}"<br>Response: ${item.response}<br>${item.feedback} 🌟<br>`;
            });
            feedbackText += '<br><div class="advice-section"><h3>Important Pre-Interview Advice</h3><ul>';
            data.pre_interview_advice.forEach((advice) => {
                feedbackText += `<li><strong>${advice.title}</strong>: ${advice.description}</li>`;
            });
            feedbackText += '</ul></div>';
            document.getElementById("transcript").innerHTML += feedbackText;
            document.getElementById("status").textContent = "Status: Interview Complete 🎈";

            const utterance = new SpeechSynthesisUtterance(
                "Interview complete. Here is your feedback: " +
                data.feedback.map((item, i) => `For question ${i + 1}: ${item.feedback}`).join(". ") +
                ". Important pre-interview advice: " +
                data.pre_interview_advice.map((advice, i) => `${i + 1}. ${advice.title}: ${advice.description}`).join(". ")
            );
            utterance.lang = "en-US";
            window.speechSynthesis.speak(utterance);

            document.getElementById("startBtn").disabled = true;
            document.getElementById("stopBtn").disabled = true;
            document.getElementById("restartBtn").disabled = false;
        } else {
            document.getElementById("transcript").innerHTML += `<br>Current Question: ${data.next_question}`;
            document.getElementById("status").textContent = "Status: Ready";
            document.getElementById("startBtn").disabled = false;
            document.getElementById("stopBtn").disabled = true;

            const utterance = new SpeechSynthesisUtterance(data.next_question);
            utterance.lang = "en-US";
            window.speechSynthesis.speak(utterance);
        }
    } catch (err) {
        console.error("Error submitting response:", err);
        document.getElementById("status").textContent = "Status: Error submitting response";
    }
};

recognition.onend = () => {
    document.getElementById("startBtn").disabled = false;
    document.getElementById("stopBtn").disabled = true;
    micIcon.classList.remove('listening');
    if (document.getElementById("status").textContent === "Status: Listening...") {
        document.getElementById("status").textContent = "Status: Ready";
    }
};

recognition.onerror = (event) => {
    micIcon.classList.remove('listening');
    if (event.error === "no-speech") {
        document.getElementById("status").textContent = "Status: No speech detected, please try speaking louder or check your microphone 😕";
        document.getElementById("startBtn").disabled = false;
        document.getElementById("stopBtn").disabled = true;
        setTimeout(startRecognition, 2000);
    } else {
        console.error("Speech recognition error:", event.error);
        document.getElementById("status").textContent = `Status: Error - ${event.error}`;
        document.getElementById("startBtn").disabled = false;
        document.getElementById("stopBtn").disabled = true;
    }
};

document.getElementById("startBtn").addEventListener("click", startRecognition);

document.getElementById("stopBtn").addEventListener("click", () => {
    recognition.stop();
});

document.getElementById("restartBtn").addEventListener("click", async () => {
    try {
        const response = await fetch('/reset', { method: 'POST' });
        const data = await response.json();
        document.getElementById("transcript").innerHTML = `Current Question: ${data.question}`;
        document.getElementById("status").textContent = "Status: Ready";
        document.getElementById("startBtn").disabled = false;
        document.getElementById("stopBtn").disabled = true;
        document.getElementById("restartBtn").disabled = true;
        document.getElementById("history").style.display = "none";

        const utterance = new SpeechSynthesisUtterance(data.question);
        utterance.lang = "en-US";
        window.speechSynthesis.speak(utterance);
    } catch (err) {
        console.error("Error resetting interview:", err);
        document.getElementById("status").textContent = "Status: Error resetting interview";
    }
});

document.getElementById("historyBtn").addEventListener("click", async () => {
    try {
        const response = await fetch('/history');
        const history = await response.json();
        const historyList = document.getElementById("historyList");
        historyList.innerHTML = "";
        history.forEach((item) => {
            const li = document.createElement("li");
            li.textContent = `${item.timestamp} - ${item.name} (${item.is_complete ? 'Complete' : 'Incomplete'})`;
            const viewBtn = document.createElement("button");
            viewBtn.textContent = "View";
            viewBtn.onclick = () => viewInterview(item.id);
            const resumeBtn = document.createElement("button");
            resumeBtn.textContent = "Resume";
            resumeBtn.disabled = item.is_complete;
            resumeBtn.onclick = () => resumeInterview(item.id);
            li.appendChild(viewBtn);
            li.appendChild(resumeBtn);
            historyList.appendChild(li);
        });
        document.getElementById("history").style.display = "block";
        document.getElementById("transcript").style.display = "none";
        document.getElementById("status").textContent = "Status: Viewing History 📜";
    } catch (err) {
        console.error("Error fetching history:", err);
        document.getElementById("status").textContent = "Status: Error fetching history";
    }
});

async function viewInterview(id) {
    try {
        const response = await fetch(`/interview/${id}`);
        const data = await response.json();
        if (data.error) {
            document.getElementById("status").textContent = "Status: " + data.error;
            return;
        }
        let transcriptText = `<h2>Interview on ${data.timestamp} (${data.name}) 😊</h2>`;
        data.responses.forEach((resp, i) => {
            transcriptText += `<br>Question ${i + 1}: "${data.questions[i].question}"<br>Response: ${resp.transcription}`;
            if (data.feedback[i]) {
                transcriptText += `<br>${data.feedback[i].feedback} 🌟`;
            }
        });
        if (data.is_complete) {
            transcriptText += '<br><div class="advice-section"><h3>Important Pre-Interview Advice</h3><ul>';
            pre_interview_advice.forEach((advice) => {
                transcriptText += `<li><strong>${advice.title}</strong>: ${advice.description}</li>`;
            });
            transcriptText += '</ul></div>';
        }
        document.getElementById("transcript").innerHTML = transcriptText;
        document.getElementById("transcript").style.display = "block";
        document.getElementById("history").style.display = "none";
        document.getElementById("status").textContent = "Status: Viewing Interview 📜";
    } catch (err) {
        console.error("Error viewing interview:", err);
        document.getElementById("status").textContent = "Status: Error viewing interview";
    }
}

async function resumeInterview(id) {
    try {
        const response = await fetch(`/resume/${id}`, { method: 'POST' });
        const data = await response.json();
        if (data.error) {
            document.getElementById("status").textContent = "Status: " + data.error;
            return;
        }
        document.getElementById("transcript").innerHTML = `Current Question: ${data.question}`;
        document.getElementById("transcript").style.display = "block";
        document.getElementById("history").style.display = "none";
        document.getElementById("status").textContent = "Status: Ready";
        document.getElementById("startBtn").disabled = false;
        document.getElementById("stopBtn").disabled = true;
        document.getElementById("restartBtn").disabled = true;

        const utterance = new SpeechSynthesisUtterance(data.question);
        utterance.lang = "en-US";
        window.speechSynthesis.speak(utterance);
    } catch (err) {
        console.error("Error resuming interview:", err);
        document.getElementById("status").textContent = "Status: Error resuming interview";
    }
}

const pre_interview_advice = [
    {'title': 'Research the Company Background', 'description': 'Understand the company’s mission, values, products, and recent achievements to show genuine interest. For example, visit the company’s website and LinkedIn to note their latest projects or awards.'},
    {'title': 'Understand the Job Role', 'description': 'Study the job description to align your skills and experiences with the role’s requirements. For example, prepare to explain how your past projects match the job’s key responsibilities.'},
    {'title': 'Dress Appropriately for the Interview', 'description': 'Wear professional attire suited to the company’s culture, such as business formal for corporate roles or smart casual for startups. For example, a neat blazer and trousers may suffice for a tech startup, while a suit is ideal for finance roles.'},
    {'title': 'Practice Common Interview Questions', 'description': 'Rehearse answers to questions like “What is your greatest strength?” to build confidence. For example, use this app to practice varied questions and refine your responses.'},
    {'title': 'Strategies to Impress Interviewers', 'description': 'Show enthusiasm, ask insightful questions, and highlight specific achievements with measurable outcomes. For example, ask, “What does success look like in this role?” and share a story of how you increased efficiency by 20% in a past job.'}
];

setupVolumeMeter();