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

    # 1. Fetch available models for this specific API key to bypass any 404s
    models_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    try:
        req_models = urllib.request.Request(models_url)
        with urllib.request.urlopen(req_models) as response:
            models_data = json.loads(response.read().decode('utf-8'))
            
            available_models = []
            for m in models_data.get("models", []):
                if "generateContent" in m.get("supportedGenerationMethods", []):
                    available_models.append(m["name"])
            
            if not available_models:
                return {"action": "none", "response": "Your API key is valid, but Google says it has no access to any text generation models!"}
                
            # Prefer 3.6 flash, then 3.6 pro, else fallback to first available
            chosen_model = None
            preferences = ["models/gemini-3.6-flash", "models/gemini-3.6-pro", "models/gemini-2.5-flash", "models/gemini-1.5-flash"]
            for pref in preferences:
                if pref in available_models:
                    chosen_model = pref
                    break
            
            if not chosen_model:
                chosen_model = available_models[0]
                
    except Exception as e:
        return {"action": "none", "response": f"Failed to fetch available models from Google: {str(e)}"}

    # 2. Call generateContent with the dynamically chosen model
    url = f"https://generativelanguage.googleapis.com/v1beta/{chosen_model}:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    # Gemini 1.0 Pro does not support JSON mode natively
    if "gemini-pro" in chosen_model and "1.5" not in chosen_model:
        del payload["generationConfig"]["responseMimeType"]
    
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
        return {"action": "none", "response": f"Google API Error with model {chosen_model}: {error_msg}"}
    except Exception as e:
        return {"action": "none", "response": f"My AI brain encountered an error: {str(e)}"}
