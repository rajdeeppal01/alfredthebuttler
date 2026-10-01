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
        ist_timezone = timezone(timedelta(hours=5, minutes=30))
        today_start = datetime.now(ist_timezone).replace(hour=0, minute=0, second=0, microsecond=0)
        daily_pushes = 0
        latest_push = None
        
        for event in events:
            event_time = event.created_at.replace(tzinfo=timezone.utc).astimezone(ist_timezone)
            if event_time >= today_start:
                if event.type == "PushEvent":
                    daily_pushes += len(event.payload.get("commits", []))
                elif event.type in ["PullRequestEvent", "IssuesEvent", "CreateEvent"]:
                    daily_pushes += 1
            
            if event.type == "PushEvent" and not latest_push:
                commits = event.payload.get("commits", [])
                msg = commits[-1].get("message", "Pushed to repository") if commits else "Pushed to repository"
                latest_push = {
                    "repository": event.repo.name,
                    "title": msg,
                    "type": "Latest Push"
                }
            
            # Since events are chronological descending, if we go past today we can't break if we haven't found the latest push, but typically we find it quickly.
            # We must iterate far enough to count all of today's pushes.
            if event_time < today_start and latest_push:
                break
                
        if latest_push:
            results.append(latest_push)
            
        results.append({
            "repository": "N/A",
            "title": str(daily_pushes),
            "type": "Daily Pushes"
        })
                
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
