import { useState, useEffect } from 'react';
import './App.css';
import PrivacyPolicy from './PrivacyPolicy';
import TermsConditions from './TermsConditions';
// @ts-ignore
import Antigravity from '@/components/Antigravity';

interface Chore {
  id: string;
  title: string;
  completed: boolean;
}

interface Email {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
}

interface GithubNotif {
  repository: string;
  title: string;
  type: string;
}

interface ObsidianNote {
  title: string;
  snippet: string;
}

function App() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [newChore, setNewChore] = useState('');
  const [emails, setEmails] = useState<Email[]>([]);
  const [github, setGithub] = useState<GithubNotif[]>([]);
  const [obsidian, setObsidian] = useState<ObsidianNote[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const fetchData = async () => {
    try {
      const [choresRes, emailsRes, githubRes, obsidianRes] = await Promise.all([
        fetch('/api/chores'),
        fetch('/api/emails'),
        fetch('/api/projects/github'),
        fetch('/api/projects/obsidian')
      ]);

      setChores(await choresRes.json());
      setEmails(await emailsRes.json());
      setGithub(await githubRes.json());
      setObsidian(await obsidianRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const triggerRundown = async () => {
    if (isGenerating || isPlaying) return;
    setIsGenerating(true);

    const pendingChores = chores.filter(c => !c.completed).length;
    let rundownText = `Good morning! You have ${pendingChores} pending chores today. `;
    
    if (emails.length > 0) {
      rundownText += `You have ${emails.length} unread emails. `;
    }
    
    if (github.length > 0) {
      rundownText += `You have ${github.length} GitHub notifications. `;
    }

    rundownText += "Have a great day!";

    try {
      const audioUrl = `/api/voice/play?text=${encodeURIComponent(rundownText)}`;
      const audio = new Audio(audioUrl);
      
      audio.oncanplaythrough = () => {
        setIsGenerating(false);
        setIsPlaying(true);
        audio.play();
      };
      
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsGenerating(false);
        setIsPlaying(false);
      };
    } catch (e) {
      console.error("Error playing rundown", e);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Trigger on Ctrl+Space
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        triggerRundown();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chores, emails, github, isGenerating, isPlaying]);

  const addChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChore.trim()) return;
    await fetch('/api/chores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newChore })
    });
    setNewChore('');
    fetchData();
  };

  const toggleChore = async (id: string, completed: boolean) => {
    await fetch(`http://127.0.0.1:8000/chores/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed })
    });
    fetchData();
  };

  const deleteChore = async (id: string) => {
    await fetch(`http://127.0.0.1:8000/chores/${id}`, { method: 'DELETE' });
    fetchData();
  };

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}>
        <Antigravity
          count={300}
          magnetRadius={10}
          ringRadius={10}
          waveSpeed={0.4}
          waveAmplitude={1}
          particleSize={2}
          lerpSpeed={0.1}
          color="#3b82f6"
          autoAnimate={false}
          particleVariance={1}
          rotationSpeed={0}
          depthFactor={1}
          pulseSpeed={3}
          particleShape="capsule"
          fieldStrength={10}
        />
      </div>
      
      <div className="app-container">
        <header className="header glass-panel">
          <h1>Assistant Dashboard</h1>
          <button 
            className={`rundown-btn ${isGenerating ? 'pulsing' : ''} ${isPlaying ? 'playing' : ''}`}
            onClick={triggerRundown}
          >
            {isGenerating ? 'Generating...' : isPlaying ? 'Playing Audio...' : 'Play Morning Rundown (Ctrl+Space)'}
          </button>
        </header>

        <div className="dashboard-grid">
          {/* Chores Panel */}
          <div className="section glass-panel">
            <h2>Daily Chores</h2>
            <form onSubmit={addChore} className="add-chore-form">
              <input value={newChore} onChange={(e) => setNewChore(e.target.value)} placeholder="Add a new chore..." />
              <button type="submit">Add</button>
            </form>
            <ul className="list">
              {chores.map(chore => (
                <li key={chore.id} className={chore.completed ? 'completed' : ''}>
                  <div className="item-info" onClick={() => toggleChore(chore.id, chore.completed)}>
                    <div className={`checkbox ${chore.completed ? 'checked' : ''}`}></div>
                    <span>{chore.title}</span>
                  </div>
                  <button className="delete-btn" onClick={() => deleteChore(chore.id)}>✕</button>
                </li>
              ))}
              {chores.length === 0 && <p className="empty-state">No chores for today!</p>}
            </ul>
          </div>

          {/* Emails Panel */}
          <div className="section glass-panel">
            <h2>Unread Emails</h2>
            <ul className="list">
              {emails.map(email => (
                <li key={email.id} className="data-item">
                  <strong>{email.subject}</strong>
                  <span className="subtitle">{email.sender}</span>
                  <p className="snippet">{email.snippet.substring(0, 50)}...</p>
                </li>
              ))}
              {emails.length === 0 && <p className="empty-state">Inbox Zero!</p>}
            </ul>
          </div>

          {/* GitHub Panel */}
          <div className="section glass-panel">
            <h2>GitHub Notifications</h2>
            <ul className="list">
              {github.map((notif, idx) => (
                <li key={idx} className="data-item">
                  <strong>{notif.repository}</strong>
                  <span className="subtitle">{notif.type}</span>
                  <p className="snippet">{notif.title}</p>
                </li>
              ))}
              {github.length === 0 && <p className="empty-state">All caught up on GitHub!</p>}
            </ul>
          </div>

          {/* Obsidian Panel */}
          <div className="section glass-panel">
            <h2>Recent Notes</h2>
            <ul className="list">
              {obsidian.map((note, idx) => (
                <li key={idx} className="data-item">
                  <strong>{note.title}</strong>
                  <p className="snippet">{note.snippet}</p>
                </li>
              ))}
              {obsidian.length === 0 && <p className="empty-state">No recent notes found.</p>}
            </ul>
          </div>
        </div>
      </div>
      
      <footer className="footer-links">
        <button className="text-link" onClick={() => setShowPrivacy(true)}>Privacy Policy</button>
        <button className="text-link" onClick={() => setShowTerms(true)}>Terms & Conditions</button>
      </footer>

      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      {showTerms && <TermsConditions onClose={() => setShowTerms(false)} />}
    </>
  );
}

export default App;
