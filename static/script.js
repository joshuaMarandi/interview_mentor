// Cross-browser SpeechRecognition API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    alert("Your browser does not support the SpeechRecognition API. Please use Chrome or Edge.");
}

const recognition = new SpeechRecognition();
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.continuous = false;
recognition.maxAlternatives = 1;

// Audio context for volume meter
let audioContext = null;
let analyser = null;
let microphone = null;
let javascriptNode = null;

// Volume meter setup
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

// Start recognition with timeout
function startRecognition() {
    recognition.start();
    setTimeout(() => {
        if (document.getElementById("status").textContent === "Status: Listening...") {
            recognition.stop();
        }
    }, 10000);
}

// Handle speech recognition
recognition.onstart = () => {
    window.speechSynthesis.cancel();
    document.getElementById("status").textContent = "Status: Listening...";
    document.getElementById("startBtn").disabled = true;
    document.getElementById("stopBtn").disabled = false;
};

recognition.onresult = async (event) => {
    const transcription = event.results[0][0].transcript;
    document.getElementById("transcript").innerHTML += `<br>Response: ${transcription}`;

    try {
        const response = await fetch('/submit_response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcription })
        });
        const data = await response.json();

        if (data.complete) {
            let feedbackText = "<br><br>Feedback for Your Responses:<br>";
            data.feedback.forEach((item, index) => {
                feedbackText += `<br>Question ${index + 1}: "${item.question}"<br>Response: ${item.response}<br>${item.feedback}<br>`;
            });
            document.getElementById("transcript").innerHTML += feedbackText;
            document.getElementById("status").textContent = "Status: Interview Complete";

            const utterance = new SpeechSynthesisUtterance(
                "Interview complete. Here is your feedback: " +
                data.feedback.map((item, i) => `For question ${i + 1}: ${item.feedback}`).join(". ")
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
    if (document.getElementById("status").textContent === "Status: Listening...") {
        document.getElementById("status").textContent = "Status: Ready";
    }
};

recognition.onerror = (event) => {
    if (event.error === "no-speech") {
        document.getElementById("status").textContent = "Status: No speech detected, please try speaking louder or check your microphone";
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

// Button event listeners
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

        const utterance = new SpeechSynthesisUtterance(data.question);
        utterance.lang = "en-US";
        window.speechSynthesis.speak(utterance);
    } catch (err) {
        console.error("Error resetting interview:", err);
        document.getElementById("status").textContent = "Status: Error resetting interview";
    }
});

// Initialize volume meter
setupVolumeMeter();