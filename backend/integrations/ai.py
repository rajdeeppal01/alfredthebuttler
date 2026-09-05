import os
import json
import google.generativeai as genai

def process_voice_command(user_text: str, context: dict = None):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"action": "none", "response": "I cannot connect to my brain. Please set the Gemini API key."}
        
    genai.configure(api_key=api_key)
    
    # We use gemini-1.5-flash for speed in voice interactions
    model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"response_mime_type": "application/json"})
    
    context_str = json.dumps(context) if context else "No context available."
    
    prompt = f"""You are Alfred, a highly intelligent voice assistant for a personal dashboard. 
The user is speaking to you. 
Determine their intent and return a JSON object.

Here is the LIVE data currently on their dashboard:
{context_str}

Supported actions:
- "add_chore": If they want to add a chore. Include a "title" field with the chore name.
- "delete_chore": If they want to delete or mark a chore as done. Include a "title" field with the chore name to delete.
- "add_note": If they want to add an obsidian note. Include a "title" and "content" field.
- "none": For general conversation, answering questions about the dashboard data, or anything else.

Your JSON MUST strictly match this schema:
{{
  "action": "add_chore" | "delete_chore" | "add_note" | "none",
  "title": "optional title for chore or note",
  "content": "optional content for note",
  "response": "A conversational voice response you will speak back to the user."
}}

Crucially, if the user asks a question about their data (e.g. "what are my chores?", "who emailed me?", "read my rundown"), you MUST use the LIVE data provided above to answer them accurately in the 'response' field, and set action to 'none'. Keep your conversational response brief, friendly, and natural. Do not use markdown or emojis as it will be read by a text-to-speech engine.

User said: "{user_text}"
"""
    
    try:
        response = model.generate_content(prompt)
        # Use simple try-except in case Gemini returns non-JSON or a markdown block
        text_resp = response.text
        if text_resp.startswith("```json"):
            text_resp = text_resp.replace("```json", "").replace("```", "").strip()
        
        result = json.loads(text_resp)
        return result
    except Exception as e:
        print(f"Gemini Error: {e}")
        try:
            # If the response itself failed to generate (e.g. safety blocks)
            prompt_feedback = response.prompt_feedback if hasattr(response, 'prompt_feedback') else "Unknown"
            print(f"Feedback: {prompt_feedback}")
        except:
            pass
        return {"action": "none", "response": f"My AI brain encountered an error: {str(e)}"}
