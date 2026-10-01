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
        
        query = """
        query($login: String!) {
          user(login: $login) {
            y2026: contributionsCollection(from: "2026-01-01T00:00:00Z", to: "2026-12-31T23:59:59Z") {
              contributionCalendar { totalContributions }
            }
            y2025: contributionsCollection(from: "2025-01-01T00:00:00Z", to: "2025-12-31T23:59:59Z") {
              contributionCalendar { totalContributions }
            }
            y2024: contributionsCollection(from: "2024-01-01T00:00:00Z", to: "2024-12-31T23:59:59Z") {
              contributionCalendar { totalContributions }
            }
            today: contributionsCollection {
              contributionCalendar {
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
            user_data = data.get("data", {}).get("user", {})
            
            # Sum all time contributions across recent years
            for year_key in ["y2024", "y2025", "y2026"]:
                total_contributions += user_data.get(year_key, {}).get("contributionCalendar", {}).get("totalContributions", 0)
                
            calendar = user_data.get("today", {}).get("contributionCalendar", {})
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
                repo_name = event.repo.name.split("/")[-1] if event.repo.name else "Unknown"
                # Skip the dashboard repository and any test 'Abc' repos the user might have made
                if repo_name.lower() in ["alfredthebuttler", "abc"]:
                    continue
                    
                commits = event.payload.get("commits", [])
                msg = commits[-1].get("message", "Pushed to repository") if commits else "Pushed to repository"
                
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
