import pandas as pd

# Define a sample of 20 unique questions
questions = [
    {
        'question': 'Tell me about yourself.',
        'keywords': 'background,experience,skills,education,career',
        'example': "For example, you could say: 'I have a background in software engineering with three years of experience building web applications, and I hold a degree in computer science. I’m passionate about solving complex problems and continuously improving my skills.'"
    },
    {
        'question': 'What is your greatest strength?',
        'keywords': 'strength,skill,ability,expertise,talent',
        'example': "For example, you could say: 'My greatest strength is my problem-solving ability, demonstrated by leading a team to resolve a critical project issue under a tight deadline.'"
    },
    {
        'question': 'What is your biggest weakness?',
        'keywords': 'weakness,challenge,improve',
        'example': "For example, you could say: 'My biggest weakness is that I sometimes take on too many tasks, but I’ve been improving by prioritizing and delegating effectively, as shown in a recent project where I streamlined team workflows.'"
    },
    {
        'question': 'Why do you want this job?',
        'keywords': 'motivation,job,career,passion',
        'example': "For example, you could say: 'I’m excited about this role because it aligns with my passion for data analysis and offers opportunities to contribute to innovative projects, like I did when I optimized a company’s reporting system in my previous job.'"
    },
    {
        'question': 'Describe a challenge you faced and how you handled it.',
        'keywords': 'challenge,problem,solution,overcome',
        'example': "For example, you could say: 'In my last role, I faced a challenge when a key client project was at risk due to a technical issue. I led a team to troubleshoot the problem, implemented a solution under pressure, and delivered the project on time, earning client praise.'"
    },
    {
        'question': 'Where do you see yourself in five years?',
        'keywords': 'goals,career,vision,progress',
        'example': "For example, you could say: 'In five years, I see myself leading a team in software development, having grown my technical and leadership skills, as I’m currently doing by mentoring junior developers.'"
    },
    {
        'question': 'Why should we hire you?',
        'keywords': 'value,skills,contribution,fit',
        'example': "For example, you could say: 'You should hire me because my expertise in data science and proven track record of delivering insights, like increasing sales by 10% at my last job, will add immediate value to your team.'"
    },
    {
        'question': 'How do you handle stress and pressure?',
        'keywords': 'stress,pressure,manage,coping',
        'example': "For example, you could say: 'I handle stress by prioritizing tasks and staying organized, like when I managed a tight project deadline by breaking it into milestones, ensuring timely delivery.'"
    },
    {
        'question': 'What are your salary expectations?',
        'keywords': 'salary,compensation,expectations',
        'example': "For example, you could say: 'I’m looking for a salary that reflects my experience and the market rate for this role, ideally in the range of industry standards, and I’m open to discussing specifics.'"
    },
    {
        'question': 'Describe a time you worked in a team.',
        'keywords': 'team,collaboration,cooperation',
        'example': "For example, you could say: 'In my last role, I collaborated with a cross-functional team to launch a product, coordinating tasks and resolving conflicts to meet our deadline.'"
    },
    {
        'question': 'What motivates you to perform well?',
        'keywords': 'motivation,drive,passion',
        'example': "For example, you could say: 'I’m motivated by solving complex problems and seeing tangible results, like when I optimized a system that improved efficiency by 15%.'"
    },
    {
        'question': 'How do you prioritize tasks?',
        'keywords': 'prioritize,organization,manage',
        'example': "For example, you could say: 'I prioritize tasks based on urgency and impact, using tools like Trello, as I did to manage a project with multiple deliverables last year.'"
    },
    {
        'question': 'Describe a time you showed leadership.',
        'keywords': 'leadership,initiative,guide',
        'example': "For example, you could say: 'I took the lead on a stalled project, assigning tasks and motivating the team to deliver it two weeks ahead of schedule.'"
    },
    {
        'question': 'What is your approach to problem-solving?',
        'keywords': 'problem,solution,approach',
        'example': "For example, you could say: 'I approach problems systematically, analyzing root causes and testing solutions, like when I resolved a database issue by debugging and optimizing queries.'"
    },
    {
        'question': 'How do you handle feedback?',
        'keywords': 'feedback,receptive,improve',
        'example': "For example, you could say: 'I welcome feedback as a chance to grow, like when I used manager input to improve my presentation skills, leading to better client pitches.'"
    },
    {
        'question': 'What technical skills do you bring to this role?',
        'keywords': 'technical,skills,expertise',
        'example': "For example, you could say: 'I bring expertise in Python and SQL, used to build data pipelines that reduced processing time by 20% in my last role.'"
    },
    {
        'question': 'Describe a time you failed and what you learned.',
        'keywords': 'failure,learn,improve',
        'example': "For example, you could say: 'I once missed a project deadline due to poor planning, but I learned to use project management tools, ensuring success in future projects.'"
    },
    {
        'question': 'How do you stay updated in your field?',
        'keywords': 'learn,update,professional',
        'example': "For example, you could say: 'I stay updated by reading industry blogs and taking online courses, like a recent machine learning course that enhanced my skills.'"
    },
    {
        'question': 'What is your experience with project management?',
        'keywords': 'project,management,organize',
        'example': "For example, you could say: 'I managed a software project using Agile, coordinating sprints and deliverables to launch on time.'"
    },
    {
        'question': 'How do you handle conflicts in the workplace?',
        'keywords': 'conflict,resolve,communication',
        'example': "For example, you could say: 'I resolve conflicts through open communication, like when I mediated a team disagreement to align on project goals.'"
    },
]

# Simulate 200+ questions (for presentation; replace with unique questions for production)
for i in range(180):
    base_question = questions[i % len(questions)].copy()
    base_question['question'] = f"{base_question['question']} (Variation {i+1})"
    questions.append(base_question)

# Save to CSV
df = pd.DataFrame(questions)
df.to_csv('questions.csv', index=False)
print(f"Saved {len(questions)} questions to questions.csv")

# For Colab: Download the CSV
try:
    from google.colab import files
    files.download('questions.csv')
except ImportError:
    print("Not in Colab, CSV saved locally")