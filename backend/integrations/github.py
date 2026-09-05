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
        events = g.get_user().get_events()
        
        results = []
        for event in events:
            if event.type == "PushEvent":
                repo_name = event.repo.name
                commits = event.payload.get("commits", [])
                if commits:
                    msg = commits[-1].get("message", "Pushed commits")
                else:
                    msg = "Pushed to repository"
                
                results.append({
                    "repository": repo_name,
                    "title": msg,
                    "type": "Push"
                })
            if len(results) >= 5:
                break
        return results
    except Exception as e:
        print(f"GitHub Error: {e}")
        return []
