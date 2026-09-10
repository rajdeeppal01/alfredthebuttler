import os
import glob
import json
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from dotenv import load_dotenv

load_dotenv()

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def fetch_emails(creds, account_name, all_email_summaries):
    service = build('gmail', 'v1', credentials=creds)
    try:
        results = service.users().messages().list(userId='me', labelIds=['INBOX', 'UNREAD'], maxResults=20).execute()
        messages = results.get('messages', [])
        
        for message in messages:
            msg = service.users().messages().get(userId='me', id=message['id']).execute()
            snippet = msg.get('snippet', '')
            
            headers = msg['payload']['headers']
            subject = next((header['value'] for header in headers if header['name'].lower() == 'subject'), 'No Subject')
            sender = next((header['value'] for header in headers if header['name'].lower() == 'from'), 'Unknown Sender')
            
            all_email_summaries.append({
                'id': f"{account_name}_{message['id']}",
                'sender': f"[{account_name.upper()}] {sender}",
                'subject': subject,
                'snippet': snippet
            })
        return True # Indicates successful authentication/fetch
    except Exception as error:
        raise Exception(f"API Error: {error}")

def get_unread_emails():
    all_email_summaries = []
    error_msgs = []
    auth_success = False
    
    # 1. Check environment variables for tokens (Vercel deployment)
    for env_key, account_name in [('GMAIL_TOKEN_WORK', 'work')]:
        token_str = os.getenv(env_key)
        if token_str:
            try:
                # Handle potential quoting issues from env vars
                if token_str.startswith("'") and token_str.endswith("'"): token_str = token_str[1:-1]
                if token_str.startswith('"') and token_str.endswith('"'): token_str = token_str[1:-1]
                
                token_data = json.loads(token_str)
                creds = Credentials.from_authorized_user_info(token_data, SCOPES)
                if fetch_emails(creds, account_name, all_email_summaries):
                    auth_success = True
            except Exception as e:
                error_msgs.append(f"Env var error ({env_key}): {str(e)}")
        else:
            error_msgs.append(f"{env_key} is empty or not set.")

    # 2. Fallback to local files (Local development)
    if not auth_success:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        token_path = os.path.join(base_dir, 'token_work.json')
        if os.path.exists(token_path):
            try:
                creds = Credentials.from_authorized_user_file(token_path, SCOPES)
                if fetch_emails(creds, 'work', all_email_summaries):
                    auth_success = True
            except Exception as e:
                error_msgs.append(f"Local file error: {str(e)}")
        else:
            error_msgs.append("Local token_work.json not found.")

    if not auth_success:
        error_details = " | ".join(error_msgs)
        return [{"id": "0", "sender": "System", "subject": "Auth Required", "snippet": f"Debug info: {error_details}"}]
        
    return all_email_summaries
