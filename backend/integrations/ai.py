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
If they ask about their latest GitHub pushes or activity, use the "check_github" action to fetch fresh data.
Otherwise, just respond conversationally.

Respond ONLY with a valid JSON object matching the exact structure below, with NO markdown formatting, NO backticks, and NO extra text:
{{
    "action": "none" | "add_chore" | "send_email" | "check_github" | "toggle_streak",
    "title": "Title of chore or streak to interact with, if applicable",
    "response": "Your spoken response here. (If action is check_github, leave response blank, the system will fill it)"
}}
"""

    # Define a list of models to try in case of high demand / 503 errors
    fallback_models = ["models/gemini-3.6-flash", "models/gemini-3.6-pro", "models/gemini-2.5-flash", "models/gemini-1.5-pro"]
    last_error = "Unknown error"
    
    for chosen_model in fallback_models:
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
                last_error = error_json.get("error", {}).get("message", error_body)
            except:
                last_error = str(e)
            
            # If we get a 404 or 503, try the next model
            continue
        except Exception as e:
            last_error = str(e)
            continue

    return {"action": "none", "response": f"All Google AI models failed (Google's servers might be down). Last error from {chosen_model}: {last_error}"}

def generate_greeting(context: dict = None):
    api_key = os.getenv("GEMINI_API_KEY")
    from datetime import datetime
    
    hour = datetime.now().hour
    if 5 <= hour < 12:
        time_of_day = "morning"
    elif 12 <= hour < 16:
        time_of_day = "afternoon"
    else:
        time_of_day = "evening"
        
    if not api_key:
        return f"Good {time_of_day}! Please set your Gemini API key to activate my brain."
        
    context_str = json.dumps(context) if context else "No context available."
    prompt = f"""
You are Alfred, a highly intelligent voice assistant. 
Generate a short, concise, and professional {time_of_day} rundown greeting for "Mr. Wayne". 

Here is his live dashboard data:
<context>
{context_str}
</context>

Instructions:
1. Greet him by name ("Good {time_of_day} Mr. Wayne...").
2. Summarize his pending chores.
3. Check the GitHub data. The data contains your 'Latest Push' and any 'Untouched' tracked repos. Organically call him out if he is neglecting the untouched repos, and mention his latest push! 
4. Summarize unread emails and Obsidian notes if they exist.
5. Remind him of any upcoming Reminders/Meetings if they exist.
6. Make it conversational, under 4 sentences if possible. Do NOT use markdown or bullet points. This will be spoken via TTS.
"""
    fallback_models = ["models/gemini-3.6-flash", "models/gemini-3.6-pro", "models/gemini-2.5-flash", "models/gemini-1.5-pro"]
    last_error = "Unknown error"
    
    for chosen_model in fallback_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/{chosen_model}:generateContent?key={api_key}"
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
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
                    return f"My AI brain returned an empty response. Good {time_of_day}, sir."
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except urllib.error.HTTPError as e:
            continue
        except Exception as e:
            continue
            
    return f"Good {time_of_day} sir. My AI brain is currently offline due to a connection error with Google."

