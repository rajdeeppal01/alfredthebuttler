import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

import sys

# If modifying these scopes, delete the token files.
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def main():
    account_name = input("Enter a name for this account (e.g. personal, work): ").strip()
    if not account_name:
        print("Account name is required.")
        return
        
    token_file = f'token_{account_name}.json'
    
    creds = None
    if os.path.exists(token_file):
        creds = Credentials.from_authorized_user_file(token_file, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_file, 'w') as token:
            token.write(creds.to_json())
    print(f"Gmail Authentication Successful! {token_file} has been created.")

if __name__ == '__main__':
    main()
