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
        today = datetime.now(timezone.utc).date()
        
        commits_today = 0
        latest_commit_msg = None
        latest_repo = None
        
        for event in events:
            if event.type == "PushEvent":
                commits = event.payload.get("commits", [])
                
                if not latest_repo:
                    latest_repo = event.repo.name
                    if commits:
                        latest_commit_msg = commits[-1].get("message", "Pushed to repository")
                    else:
                        latest_commit_msg = "Pushed to repository"
                    
                if event.created_at.date() == today:
                    commits_today += max(len(commits), 1)
        
        if not latest_commit_msg:
            latest_commit_msg = "No recent commits"
            latest_repo = "None"
            
        one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        dormant_repo = None
        for repo in user.get_repos(type="owner", sort="pushed", direction="asc"):
            if repo.pushed_at and repo.pushed_at.replace(tzinfo=None) < one_week_ago.replace(tzinfo=None):
                dormant_repo = repo.name
                break
                
        if not dormant_repo:
            dormant_repo = "None"
            
        return [{
            "repository": latest_repo,
            "title": latest_commit_msg,
            "commits_today": commits_today,
            "dormant_repo": dormant_repo,
            "type": "Summary"
        }]
    except Exception as e:
        print(f"GitHub Error: {e}")
        return [{"repository": "System", "title": str(e), "type": "Error"}]
