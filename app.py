from flask import Flask, render_template, request, jsonify, session
import json
import pandas as pd
import random
import sqlite3
import datetime
from scoring import score_response, has_keyword

app = Flask(__name__)
app.secret_key = 'your-secret-key'  # Replace with a secure key

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect('interviews.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS interviews
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  timestamp TEXT,
                  name TEXT,
                  questions TEXT,
                  responses TEXT,
                  feedback TEXT,
                  is_complete INTEGER)''')
    conn.commit()
    conn.close()

init_db()

# Load synonym map
with open('synonym_map.json', 'r') as f:
    synonym_map = json.load(f)

# Load questions from CSV
questions_df = pd.read_csv('questions.csv')
questions = questions_df.to_dict('records')

# Name question
name_question = {
    'question': 'What is your name?',
    'keywords': 'name',
    'example': "For example, you could say: 'My name is Joshua.'"
}

# Pre-interview advice
pre_interview_advice = [
    {'title': 'Research the Company Background', 'description': 'Understand the company’s mission, values, products, and recent achievements to show genuine interest. For example, visit the company’s website and LinkedIn to note their latest projects or awards.'},
    {'title': 'Understand the Job Role', 'description': 'Study the job description to align your skills and experiences with the role’s requirements. For example, prepare to explain how your past projects match the job’s key responsibilities.'},
    {'title': 'Dress Appropriately for the Interview', 'description': 'Wear professional attire suited to the company’s culture, such as business formal for corporate roles or smart casual for startups. For example, a neat blazer and trousers may suffice for a tech startup, while a suit is ideal for finance roles.'},
    {'title': 'Practice Common Interview Questions', 'description': 'Rehearse answers to questions like “What is your greatest strength?” to build confidence. For example, use this app to practice varied questions and refine your responses.'},
    {'title': 'Strategies to Impress Interviewers', 'description': 'Show enthusiasm, ask insightful questions, and highlight specific achievements with measurable outcomes. For example, ask, “What does success look like in this role?” and share a story of how you increased efficiency by 20% in a past job.'}
]

def clean_question(text):
    """Remove variation suffixes from question text."""
    return text.split(' (Variation')[0]

@app.route('/')
def index():
    session.clear()
    # Select 4 random questions + name question
    selected_questions = [name_question] + random.sample(questions, 4)
    session['selected_questions'] = selected_questions
    session['current_question_index'] = 0
    session['responses'] = []
    session['name'] = None
    return render_template('index.html', question=clean_question(name_question['question']))

@app.route('/submit_response', methods=['POST'])
def submit_response():
    transcription = request.json['transcription']
    current_index = session['current_question_index']
    
    # Capture name from first response
    if current_index == 0:
        session['name'] = transcription.split()[0] if transcription else "Candidate"
    
    session['responses'].append({
        'question': session['selected_questions'][current_index],
        'transcription': transcription
    })
    session['current_question_index'] += 1

    # Save interview state
    conn = sqlite3.connect('interviews.db')
    c = conn.cursor()
    c.execute('''INSERT OR REPLACE INTO interviews
                 (id, timestamp, name, questions, responses, feedback, is_complete)
                 VALUES ((SELECT id FROM interviews WHERE id = ?), ?, ?, ?, ?, ?, ?)''',
                 (session.get('interview_id'),
                  datetime.datetime.now().isoformat(),
                  session['name'],
                  json.dumps(session['selected_questions']),
                  json.dumps(session['responses']),
                  json.dumps([]),
                  0))
    session['interview_id'] = c.lastrowid
    conn.commit()
    conn.close()

    if session['current_question_index'] < len(session['selected_questions']):
        next_question = clean_question(session['selected_questions'][session['current_question_index']]['question'])
        personalized_prompt = f"Hello {session['name']}, {next_question.lower()}"
        return jsonify({
            'next_question': personalized_prompt,
            'complete': False
        })
    else:
        # Generate feedback
        feedback = []
        for response in session['responses']:
            question = response['question']
            transcription = response['transcription']
            score = score_response(transcription, question['keywords'].split(','), synonym_map)
            feedback_text = f"Score: {score}/10. "
            if score >= 7:
                feedback_text += f"Strong response, but you can enhance it further. {question['example']}"
            else:
                feedback_text += f"Your response could be improved by including specific details about your {question['keywords'].split(',')[0]}. {question['example']}"
            feedback.append({
                'question': clean_question(question['question']),
                'response': transcription,
                'feedback': feedback_text
            })
        
        # Mark interview as complete
        conn = sqlite3.connect('interviews.db')
        c = conn.cursor()
        c.execute('''UPDATE interviews SET
                     feedback = ?, is_complete = 1
                     WHERE id = ?''',
                     (json.dumps(feedback), session['interview_id']))
        conn.commit()
        conn.close()

        return jsonify({
            'feedback': feedback,
            'pre_interview_advice': pre_interview_advice,
            'complete': True
        })

@app.route('/history', methods=['GET'])
def get_history():
    conn = sqlite3.connect('interviews.db')
    c = conn.cursor()
    c.execute('SELECT id, timestamp, name, is_complete FROM interviews ORDER BY timestamp DESC')
    history = [{'id': row[0], 'timestamp': row[1], 'name': row[2], 'is_complete': row[3]} for row in c.fetchall()]
    conn.close()
    return jsonify(history)

@app.route('/interview/<int:interview_id>', methods=['GET'])
def get_interview(interview_id):
    conn = sqlite3.connect('interviews.db')
    c = conn.cursor()
    c.execute('SELECT * FROM interviews WHERE id = ?', (interview_id,))
    row = c.fetchone()
    conn.close()
    if row:
        interview = {
            'id': row[0],
            'timestamp': row[1],
            'name': row[2],
            'questions': json.loads(row[3]),
            'responses': json.loads(row[4]),
            'feedback': json.loads(row[5]),
            'is_complete': row[6]
        }
        # Clean question text in interview data
        interview['questions'] = [{**q, 'question': clean_question(q['question'])} for q in interview['questions']]
        interview['feedback'] = [{**f, 'question': clean_question(f['question'])} for f in interview['feedback']]
        return jsonify(interview)
    return jsonify({'error': 'Interview not found'}), 404

@app.route('/resume/<int:interview_id>', methods=['POST'])
def resume_interview(interview_id):
    conn = sqlite3.connect('interviews.db')
    c = conn.cursor()
    c.execute('SELECT * FROM interviews WHERE id = ?', (interview_id,))
    row = c.fetchone()
    conn.close()
    if row:
        session.clear()
        session['interview_id'] = row[0]
        session['selected_questions'] = json.loads(row[3])
        session['responses'] = json.loads(row[4])
        session['name'] = row[2]
        session['current_question_index'] = len(session['responses'])
        if session['current_question_index'] < len(session['selected_questions']):
            next_question = clean_question(session['selected_questions'][session['current_question_index']]['question'])
            personalized_prompt = f"Hello {session['name']}, {next_question.lower()}"
            return jsonify({'question': personalized_prompt})
        return jsonify({'error': 'Interview already complete'}), 400
    return jsonify({'error': 'Interview not found'}), 404

@app.route('/reset', methods=['POST'])
def reset():
    session.clear()
    session['selected_questions'] = [name_question] + random.sample(questions, 4)
    session['current_question_index'] = 0
    session['responses'] = []
    session['name'] = None
    return jsonify({'question': clean_question(name_question['question'])})

if __name__ == '__main__':
    app.run(debug=True)