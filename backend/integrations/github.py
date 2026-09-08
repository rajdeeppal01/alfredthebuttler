import os
from github import Github
from dotenv import load_dotenv

load_dotenv()

def get_github_notifications():
    pat = os.getenv("GITHUB_PAT")
    if not pat or pat == "your_github_personal_access_token_here":
        return [{"repository": "System", "title": "GitHub PAT Missing", "type": "Error"}]
    
    try:
        from datetime import datetime, timedelta, timezone
        g = Github(pat)
        user = g.get_user()
        my_username = user.login
        
        events = g.get_user(my_username).get_events()
        
        results = []
        
        for event in events:
            if event.type == "PushEvent":
                commits = event.payload.get("commits", [])
                latest_commit_msg = commits[-1].get("message", "Pushed to repository") if commits else "Pushed to repository"
                results.append({
                    "repository": event.repo.name,
                    "title": latest_commit_msg,
                    "type": "Latest Push"
                })
                break
                
        one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        tracked_repos = ["cywar", "cybersentinel", "q", "trackrai", "forgeai", "alfredthebuttler"]
        
        for repo in user.get_repos(type="owner", sort="pushed", direction="desc"):
            if repo.name.lower() in tracked_repos:
                if not repo.pushed_at or repo.pushed_at.replace(tzinfo=timezone.utc) < one_week_ago:
                    results.append({
                        "repository": repo.name,
                        "title": "Not touched this week",
                        "type": "Untouched"
                    })
                    
        return results
    except Exception as e:
        print(f"GitHub Error: {e}")
        return [{"repository": "System", "title": str(e), "type": "Error"}]
