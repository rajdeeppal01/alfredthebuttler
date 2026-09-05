import { useState, useEffect, useRef } from 'react';
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
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const fetchData = async () => {
    try {
      const [choresRes, emailsRes, githubRes, obsidianRes] = await Promise.all([
        fetch(`${API_URL}/chores`),
        fetch(`${API_URL}/emails`),
        fetch(`${API_URL}/projects/github`),
        fetch(`${API_URL}/projects/obsidian`)
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
      const audioUrl = `${API_URL}/voice/play?text=${encodeURIComponent(rundownText)}`;
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

  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition. Please use Chrome or Edge.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(transcript); // Populate input box instead of auto-submitting
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const submitChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    
    setIsGenerating(true);
    const textToSend = chatInput;
    setChatInput('');
    
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: textToSend,
          context: { chores, emails, github, obsidian }
        })
      });
      
      const data = await res.json();
      
      fetchData(); // Refresh UI to show any changes
      
      const audioUrl = `${API_URL}/voice/play?text=${encodeURIComponent(data.response)}`;
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
      console.error(e);
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
      // Trigger on Ctrl+M for Mic
      if (e.ctrlKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        startListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chores, emails, github, isGenerating, isPlaying, isListening]);

  const addChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChore.trim()) return;
    await fetch(`${API_URL}/chores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newChore })
    });
    setNewChore('');
    fetchData();
  };

  const toggleChore = async (id: string, completed: boolean) => {
    await fetch(`${API_URL}/chores/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed })
    });
    fetchData();
  };

  const deleteChore = async (id: string) => {
    await fetch(`${API_URL}/chores/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    await fetch(`${API_URL}/projects/obsidian`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newNoteTitle, content: newNoteContent })
    });
    setNewNoteTitle('');
    setNewNoteContent('');
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
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className={`rundown-btn ${isListening ? 'pulsing listening' : ''}`}
              onClick={startListening}
              title="Talk to Alfred (Ctrl+M)"
            >
              🎤 {isListening ? 'Listening...' : 'Talk to Alfred (Ctrl+M)'}
            </button>
            <button 
              className={`rundown-btn ${isGenerating ? 'pulsing' : ''} ${isPlaying ? 'playing' : ''}`}
              onClick={triggerRundown}
            >
              {isGenerating ? 'Thinking...' : isPlaying ? 'Speaking...' : 'Morning Rundown'}
            </button>
          </div>
        </header>

        <form onSubmit={submitChat} style={{ display: 'flex', gap: '10px', marginBottom: '30px', padding: '15px', background: 'rgba(20, 20, 20, 0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <input 
            value={chatInput} 
            onChange={(e) => setChatInput(e.target.value)} 
            placeholder='Type or say "what was my latest GitHub push?"' 
            style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px 15px', borderRadius: '8px', fontSize: '16px', outline: 'none' }}
          />
          <button type="submit" className="rundown-btn" disabled={!chatInput.trim() || isGenerating} style={{ padding: '0 25px', opacity: chatInput.trim() ? 1 : 0.5 }}>
            Send
          </button>
        </form>

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
            <h2>Latest GitHub Pushes</h2>
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
            <form onSubmit={addNote} className="add-chore-form" style={{ flexDirection: 'column', gap: '8px', marginBottom: '15px', alignItems: 'stretch' }}>
              <input value={newNoteTitle} onChange={(e) => setNewNoteTitle(e.target.value)} placeholder="Note Title..." />
              <textarea 
                value={newNoteContent} 
                onChange={(e) => setNewNoteContent(e.target.value)} 
                placeholder="Note Content..." 
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.2)', color: 'white', minHeight: '60px', fontFamily: 'inherit', resize: 'vertical' }} 
              />
              <button type="submit" style={{ alignSelf: 'flex-end', padding: '8px 16px' }}>Add Note</button>
            </form>
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
