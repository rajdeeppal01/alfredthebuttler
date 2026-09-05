import os
import json
import google.generativeai as genai

def process_voice_command(user_text: str, context: dict = None):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"action": "none", "response": "I cannot connect to my brain. Please set the Gemini API key."}
        
    genai.configure(api_key=api_key)
    
    # We use gemini-1.5-pro for better reasoning in voice interactions
    model = genai.GenerativeModel('gemini-1.5-pro', generation_config={"response_mime_type": "application/json"})
    
    context_str = json.dumps(context) if context else "No context available."
    
    prompt = f"""You are Alfred, a highly intelligent voice assistant for a personal dashboard. 
The user is speaking to you. 
Determine their intent and return a JSON object.

Here is the LIVE data currently on their dashboard:
{context_str}

Supported actions:
- "add_chore": If they want to add a chore. Include a "title" field with the chore name.
</context>

The user says: "{user_text}"

Analyze the context and provide a response that directly answers the user.
If they ask to DO something (like add a chore or send an email), determine the action.
Otherwise, just respond conversationally.

Respond ONLY with a valid JSON object matching the exact structure below, with NO markdown formatting, NO backticks, and NO extra text:
{{
    "action": "none" | "add_chore" | "send_email",
    "response": "Your spoken response here."
}}
"""
    try:
        response = model.generate_content(prompt)
        text_resp = response.text
    except Exception as e:
        if "404" in str(e):
            # Fallback for API keys that don't have access to 1.5 models (e.g., due to EU region restrictions)
            try:
                fallback_model = genai.GenerativeModel('gemini-pro')
                response = fallback_model.generate_content(prompt)
                text_resp = response.text
            except Exception as e2:
                return {"action": "none", "response": f"Failed with both 1.5 and 1.0 models. Error: {str(e2)}"}
        else:
            return {"action": "none", "response": f"My AI brain encountered an error: {str(e)}"}
            
    try:
        if text_resp.startswith("```json"):
            text_resp = text_resp.replace("```json", "").replace("```", "").strip()
        if text_resp.startswith("```"):
            text_resp = text_resp.replace("```", "").strip()
            
        result = json.loads(text_resp)
        return result
    except Exception as e:
        return {"action": "none", "response": f"My AI brain encountered a JSON parsing error: {str(e)}"}
