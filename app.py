from flask import Flask, render_template, request, jsonify, session
import json
import pandas as pd
import random
from scoring import score_response, has_keyword

app = Flask(__name__)
app.secret_key = 'your-secret-key'  # Replace with a secure key

# Load synonym map
with open('synonym_map.json', 'r') as f:
    synonym_map = json.load(f)

# Load questions from CSV
questions_df = pd.read_csv('questions.csv')
questions = questions_df.to_dict('records')

@app.route('/')
def index():
    session.clear()
    # Select 5 random questions for the session
    session['selected_questions'] = random.sample(questions, 5)
    session['current_question_index'] = 0
    session['responses'] = []
    return render_template('index.html', question=session['selected_questions'][0]['question'])

@app.route('/submit_response', methods=['POST'])
def submit_response():
    transcription = request.json['transcription']
    session['responses'].append({
        'question': session['selected_questions'][session['current_question_index']],
        'transcription': transcription
    })
    session['current_question_index'] += 1

    if session['current_question_index'] < len(session['selected_questions']):
        return jsonify({
            'next_question': session['selected_questions'][session['current_question_index']]['question'],
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
                'question': question['question'],
                'response': transcription,
                'feedback': feedback_text
            })
        return jsonify({
            'feedback': feedback,
            'complete': True
        })

@app.route('/reset', methods=['POST'])
def reset():
    session.clear()
    session['selected_questions'] = random.sample(questions, 5)
    session['current_question_index'] = 0
    session['responses'] = []
    return jsonify({'question': session['selected_questions'][0]['question']})

if __name__ == '__main__':
    app.run(debug=True)