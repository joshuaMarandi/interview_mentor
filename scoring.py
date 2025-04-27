def score_response(transcription, keywords, synonym_map):
    score = 1
    keyword_count = sum(1 for kw in keywords if has_keyword(transcription, kw, synonym_map))
    score += keyword_count * 2
    word_count = len(transcription.split())
    if word_count > 10: score += 2
    if word_count > 20: score += 1
    return min(10, max(1, score))

def has_keyword(transcription, keyword, synonym_map):
    lower_transcription = transcription.lower()
    if keyword in lower_transcription: return True
    synonyms = synonym_map.get(keyword, [])
    return any(synonym in lower_transcription for synonym in synonyms)