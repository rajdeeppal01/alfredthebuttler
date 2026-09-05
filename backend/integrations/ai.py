import os
import json
import google.generativeai as genai

def process_voice_command(user_text: str):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"action": "none", "response": "I cannot connect to my brain. Please set the Gemini API key."}
        
    genai.configure(api_key=api_key)
    
    # We use gemini-1.5-flash for speed in voice interactions
    model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"response_mime_type": "application/json"})
    
    prompt = f"""You are Alfred, a voice assistant for a personal dashboard. 
The user is speaking to you. 
Determine their intent and return a JSON object.
Supported actions:
- "add_chore": If they want to add a chore. Include a "title" field with the chore name.
- "delete_chore": If they want to delete or mark a chore as done. Include a "title" field with the chore name to delete.
- "add_note": If they want to add an obsidian note. Include a "title" and "content" field.
- "read_rundown": If they want a summary of their dashboard or day.
- "none": For general conversation or anything else.

Your JSON MUST strictly match this schema:
{{
  "action": "add_chore" | "delete_chore" | "add_note" | "read_rundown" | "none",
  "title": "optional title for chore or note",
  "content": "optional content for note",
  "response": "A short, conversational voice response you will speak back to the user. E.g. 'I have added buy groceries to your chores list sir.'"
}}

Keep your conversational response brief, friendly, and natural. Do not use markdown or emojis in the response as it will be read by a text-to-speech engine.

User said: "{user_text}"
"""
    
    try:
        response = model.generate_content(prompt)
        result = json.loads(response.text)
        return result
    except Exception as e:
        print(f"Gemini Error: {e}")
        return {"action": "none", "response": "Sorry, I had trouble processing that request."}
