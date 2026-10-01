import os
import requests
from github import Github
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone

load_dotenv()

def get_github_notifications():
    pat = os.getenv("GITHUB_PAT")
    if not pat or pat == "your_github_personal_access_token_here":
        return [{"repository": "System", "title": "GitHub PAT Missing", "type": "Error"}]
    
    try:
        g = Github(pat)
        user = g.get_user()
        my_username = user.login
        
        # 1. Fetch exact daily contributions from GraphQL (this matches the Github profile graph)
        query = """
        query($login: String!) {
          user(login: $login) {
            contributionsCollection {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    contributionCount
                    date
                  }
                }
              }
            }
          }
        }
        """
        
        headers = {"Authorization": f"Bearer {pat}"}
        variables = {"login": my_username}
        response = requests.post("https://api.github.com/graphql", json={"query": query, "variables": variables}, headers=headers)
        
        daily_pushes = 0
        total_contributions = 0
        if response.status_code == 200:
            data = response.json()
            calendar = data.get("data", {}).get("user", {}).get("contributionsCollection", {}).get("contributionCalendar", {})
            total_contributions = calendar.get("totalContributions", 0)
            weeks = calendar.get("weeks", [])
            ist_timezone = timezone(timedelta(hours=5, minutes=30))
            today_str = datetime.now(ist_timezone).strftime("%Y-%m-%d")
            
            # Find today's contribution count
            for week in weeks:
                for day in week.get("contributionDays", []):
                    if day.get("date") == today_str:
                        daily_pushes = day.get("contributionCount", 0)
        
        # 2. Fetch events to find the most recent push details
        events = user.get_events()
        latest_push = None
        
        for event in events:
            if event.type == "PushEvent":
                commits = event.payload.get("commits", [])
                msg = commits[-1].get("message", "Pushed to repository") if commits else "Pushed to repository"
                repo_name = event.repo.name.split("/")[-1] if event.repo.name else "Unknown"
                latest_push = {
                    "repository": repo_name,
                    "title": msg,
                    "type": "Latest Push"
                }
                break
                
        results = []
        if latest_push:
            results.append(latest_push)
            
        results.append({
            "repository": "N/A",
            "title": str(daily_pushes),
            "type": "Daily Pushes"
        })
        
        results.append({
            "repository": "N/A",
            "title": str(total_contributions),
            "type": "Total Contributions"
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
