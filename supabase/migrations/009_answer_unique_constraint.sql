-- Ensure each respondent can only answer a question once per response
ALTER TABLE answers ADD CONSTRAINT answers_response_question_unique UNIQUE (response_id, question_id);
