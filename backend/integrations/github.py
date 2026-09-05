import os
from github import Github
from dotenv import load_dotenv

load_dotenv()

def get_github_notifications():
    pat = os.getenv("GITHUB_PAT")
    if not pat or pat == "your_github_personal_access_token_here":
        return [{"repository": "System", "title": "GitHub PAT Missing", "type": "Error"}]
    
    try:
        g = Github(pat)
        notifications = g.get_user().get_notifications(participating=True)
        
        results = []
        # Get up to 5 unread notifications
        for notif in list(notifications)[:5]:
            results.append({
                "repository": notif.repository.full_name,
                "title": notif.subject.title,
                "type": notif.subject.type
            })
        return results
    except Exception as e:
        print(f"GitHub Error: {e}")
        return []
