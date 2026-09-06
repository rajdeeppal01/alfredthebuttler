import os
import json
import urllib.request
import urllib.error

def process_voice_command(user_text: str, context: dict = None):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"action": "none", "response": "I cannot connect to my brain. Please set the Gemini API key."}
        
    context_str = json.dumps(context) if context else "No context available."
    
    prompt = f"""
You are Alfred, a highly intelligent voice assistant for a personal dashboard. 
The user is speaking to you. 
Determine their intent and return a JSON object.

Here is the LIVE data currently on their dashboard:
<context>
{context_str}
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

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            data = json.loads(res_body)
            
            if "candidates" not in data or not data["candidates"]:
                return {"action": "none", "response": "My AI brain returned an empty response."}
                
            text_resp = data["candidates"][0]["content"]["parts"][0]["text"]
            
            if text_resp.startswith("```json"):
                text_resp = text_resp.replace("```json", "").replace("```", "").strip()
            if text_resp.startswith("```"):
                text_resp = text_resp.replace("```", "").strip()
                
            result = json.loads(text_resp)
            return result
            
    except urllib.error.HTTPError as e:
        try:
            error_body = e.read().decode('utf-8')
            error_json = json.loads(error_body)
            error_msg = error_json.get("error", {}).get("message", error_body)
        except:
            error_msg = str(e)
        return {"action": "none", "response": f"Google API Error {e.code}: {error_msg}"}
    except Exception as e:
        return {"action": "none", "response": f"My AI brain encountered an error: {str(e)}"}
