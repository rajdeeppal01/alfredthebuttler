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
        results = service.users().messages().list(userId='me', labelIds=['INBOX', 'UNREAD'], maxResults=3).execute()
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
    except Exception as error:
        print(f"An error occurred for account {account_name}: {error}")

def get_unread_emails():
    all_email_summaries = []
    
    # 1. Check environment variables for tokens (Vercel deployment)
    for env_key, account_name in [('GMAIL_TOKEN_WORK', 'work')]:
        token_str = os.getenv(env_key)
        if token_str:
            try:
                token_data = json.loads(token_str)
                creds = Credentials.from_authorized_user_info(token_data, SCOPES)
                fetch_emails(creds, account_name, all_email_summaries)
            except Exception as e:
                print(f"Error loading {env_key}: {e}")

    # 2. Fallback to local files (Local development)
    if not all_email_summaries:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        token_path = os.path.join(base_dir, 'token_work.json')
        if os.path.exists(token_path):
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
            fetch_emails(creds, 'work', all_email_summaries)

    if not all_email_summaries:
        return [{"id": "0", "sender": "System", "subject": "Auth Required", "snippet": "No Gmail accounts authenticated yet."}]
        
    return all_email_summaries
