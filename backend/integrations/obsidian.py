import os
from github import Github
from dotenv import load_dotenv

load_dotenv()

def get_recent_obsidian_notes():
    pat = os.getenv("GITHUB_PAT")
    repo_name = os.getenv("OBSIDIAN_GITHUB_REPO")
    
    if not pat or not repo_name or repo_name == "your_username/your_obsidian_repo":
        return [{"title": "Cloud Vault Not Found", "snippet": "Check OBSIDIAN_GITHUB_REPO in .env"}]
    
    try:
        g = Github(pat)
        repo = g.get_repo(repo_name)
        
        commits = repo.get_commits()
        recent_notes = []
        seen_files = set()
        
        for commit in commits[:20]:
            for file in commit.files:
                if file.filename.endswith('.md') and file.filename not in seen_files:
                    seen_files.add(file.filename)
                    try:
                        content_file = repo.get_contents(file.filename, ref=commit.sha)
                        content = content_file.decoded_content.decode('utf-8', errors='ignore')
                        snippet = content[:150].strip() + ("..." if len(content) > 150 else "")
                        recent_notes.append({
                            "title": os.path.basename(file.filename).replace('.md', ''),
                            "snippet": snippet
                        })
                    except Exception:
                        pass
                    if len(recent_notes) >= 3:
                        return recent_notes
                        
        return recent_notes
    except Exception as e:
        print(f"Obsidian Error: {e}")
        return []

def create_obsidian_note(title: str, content: str):
    pat = os.getenv("GITHUB_PAT")
    repo_name = os.getenv("OBSIDIAN_GITHUB_REPO")
    
    if not pat or not repo_name:
        return False
        
    try:
        g = Github(pat)
        repo = g.get_repo(repo_name)
        filename = f"{title.strip()}.md"
        repo.create_file(filename, f"Add note: {title}", content)
        return True
    except Exception as e:
        print(f"Error creating note: {e}")
        return False

import re

def get_obsidian_graph():
    pat = os.getenv("GITHUB_PAT")
    repo_name = os.getenv("OBSIDIAN_GITHUB_REPO")
    
    if not pat or not repo_name or repo_name == "your_username/your_obsidian_repo":
        return {"nodes": [], "links": []}
        
    try:
        g = Github(pat)
        repo = g.get_repo(repo_name)
        commits = repo.get_commits()
        
        nodes_dict = {}
        links = []
        seen_files = set()
        
        # Analyze the 30 most recently touched files to build the graph
        for commit in commits[:50]:
            for file in commit.files:
                if file.filename.endswith('.md') and file.filename not in seen_files:
                    seen_files.add(file.filename)
                    if len(seen_files) > 30:
                        break
                        
                    try:
                        content_file = repo.get_contents(file.filename, ref=commit.sha)
                        content = content_file.decoded_content.decode('utf-8', errors='ignore')
                        
                        file_title = os.path.basename(file.filename).replace('.md', '')
                        if file_title not in nodes_dict:
                            nodes_dict[file_title] = {"id": file_title, "group": 1}
                            
                        # Find [[WikiLinks]]
                        wiki_links = re.findall(r'\[\[(.*?)\]\]', content)
                        for link in wiki_links:
                            # Handle aliases [[Link|Alias]]
                            target = link.split('|')[0].strip()
                            if target not in nodes_dict:
                                nodes_dict[target] = {"id": target, "group": 2}
                            
                            links.append({
                                "source": file_title,
                                "target": target
                            })
                    except Exception:
                        pass
                        
            if len(seen_files) > 30:
                break
                
        nodes = list(nodes_dict.values())
        return {"nodes": nodes, "links": links}
    except Exception as e:
        print(f"Obsidian Graph Error: {e}")
        return {"nodes": [], "links": []}
