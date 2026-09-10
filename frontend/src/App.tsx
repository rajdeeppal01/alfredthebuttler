import { useState, useEffect, useRef } from 'react';
import './App.css';
import PrivacyPolicy from './PrivacyPolicy';
import TermsConditions from './TermsConditions';
import SpecularButton from './components/SpecularButton';
import StreakRing from './components/StreakRing';
// @ts-ignore
import Particles from './components/Particles';
import ForceGraph2D from 'react-force-graph-2d';

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

interface Reminder {
  id: string;
  title: string;
  due_date: string;
}

interface Streak {
  id: string;
  title: string;
  color: string;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
}

function App() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [newChore, setNewChore] = useState('');
  const [emails, setEmails] = useState<Email[]>([]);
  const [github, setGithub] = useState<GithubNotif[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [stickyNotes, setStickyNotes] = useState<any[]>([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  
  const [newStickyTitle, setNewStickyTitle] = useState('');
  const [newStickyContent, setNewStickyContent] = useState('');
  const [newReminder, setNewReminder] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const API_URL = 'https://alfredthebuttler-one.vercel.app';

  const fetchData = async () => {
    try {
      const fetchSafely = async (url: string, fallback: any = []) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return await res.json();
        } catch (e) {
          console.error(`Failed to fetch ${url}:`, e);
          return fallback;
        }
      };

      const [choresData, emailsData, githubData, remindersData, stickyNotesData, graphDataRes, streaksData] = await Promise.all([
        fetchSafely(`${API_URL}/chores`),
        fetchSafely(`${API_URL}/emails`),
        fetchSafely(`${API_URL}/projects/github`),
        fetchSafely(`${API_URL}/reminders`),
        fetchSafely(`${API_URL}/sticky_notes`),
        fetchSafely(`${API_URL}/projects/obsidian/graph`),
        fetchSafely(`${API_URL}/streaks`)
      ]);

      setChores(choresData);
      setEmails(emailsData);
      setGithub(githubData);
      setReminders(remindersData);
      setStickyNotes(stickyNotesData);
      setGraphData(graphDataRes);
      setStreaks(streaksData);
      
      return { chores: choresData, emails: emailsData, github: githubData, reminders: remindersData, stickyNotes: stickyNotesData, streaks: streaksData };
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const refreshGraph = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_URL}/projects/obsidian/graph`);
      if (res.ok) {
        setGraphData(await res.json());
      }
    } catch (e) {
      console.error("Failed to refresh graph:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData().then((data) => {
      if (data) autoGreet(data);
    });

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const autoGreet = async (contextData: any) => {
    try {
      const res = await fetch(`${API_URL}/generate_rundown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: "generate", context: contextData })
      });
      const data = await res.json();
      if (data.greeting) {
        const audioUrl = `${API_URL}/voice/play?text=${encodeURIComponent(data.greeting)}`;
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.play().catch(e => console.log("Autoplay blocked by browser. User must click Morning Rundown to hear it.", e));
      }
    } catch (e) {
      console.error(e);
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

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const submitChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    
    setIsGenerating(true);
    setChatResponse('');
    const textToSend = chatInput;
    setChatInput('');
    
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: textToSend,
          context: { chores, emails, github, reminders, stickyNotes, streaks }
        })
      });
      
      if (!res.ok) {
        setChatResponse(`Server Error: ${res.status}. Please check Vercel logs.`);
        setIsGenerating(false);
        return;
      }
      
      const data = await res.json();
      setChatResponse(data.response);
      
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
        // Audio failed, but we still show the text!
        console.error("Audio playback failed");
        setIsGenerating(false);
        setIsPlaying(false);
      };
    } catch (e) {
      console.error(e);
      setChatResponse(`Network Error. Could not reach the server.`);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) {
      document.body.style.backgroundColor = '#230b05'; // Dark warm brownish-red
    } else {
      document.body.style.backgroundColor = '#000000';
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Push-To-Talk on Ctrl+Space
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) startListening();
      }
      // Push-To-Talk on Ctrl+M for Mic
      if (e.ctrlKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        if (!e.repeat) startListening();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key.toLowerCase() === 'm') {
         stopListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [chores, emails, github, isGenerating, isPlaying, isListening]);

  const toggleStreak = async (streak: Streak) => {
    const today = new Date().toISOString().split('T')[0];
    if (streak.last_completed_date === today) return; // already completed today

    const updated = [...streaks];
    const index = updated.findIndex(s => s.id === streak.id);
    
    // Optimistic update
    updated[index] = { 
      ...streak, 
      current_streak: streak.current_streak + 1, 
      longest_streak: Math.max(streak.longest_streak, streak.current_streak + 1),
      last_completed_date: today 
    };
    setStreaks(updated);

    try {
      await fetch(`${API_URL}/streaks/${streak.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_completed_date: today })
      });
    } catch (e) {
      console.error('Error toggling streak', e);
      fetchData(); // revert
    }
  };

  const addStreak = async () => {
    const title = prompt("Enter new habit to track:");
    if (!title) return;
    
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    try {
      const res = await fetch(`${API_URL}/streaks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, color })
      });
      if (res.ok) {
        const newStreak = await res.json();
        setStreaks([...streaks, newStreak]);
      }
    } catch (e) {
      console.error('Error adding streak', e);
    }
  };

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

  const addReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.trim() || !newDueDate.trim()) return;
    await fetch(`${API_URL}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newReminder, due_date: newDueDate })
    });
    setNewReminder('');
    setNewDueDate('');
    fetchData();
  };

  const deleteReminder = async (id: string) => {
    await fetch(`${API_URL}/reminders/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const addStickyNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStickyTitle.trim() || !newStickyContent.trim()) return;
    await fetch(`${API_URL}/sticky_notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newStickyTitle, content: newStickyContent })
    });
    setNewStickyTitle('');
    setNewStickyContent('');
    fetchData();
  };

  const deleteStickyNote = async (id: string) => {
    await fetch(`${API_URL}/sticky_notes/${id}`, { method: 'DELETE' });
    fetchData();
  };

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}>
        <Particles
          particleColors={["#ffffff"]}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
          pixelRatio={1}
        />
      </div>
      
      <div className="app-container">
        <header className="header glass-panel">
          <h1>
            {(() => {
              const hour = new Date().getHours();
              if (hour >= 5 && hour < 12) return 'Good morning, Mr. Wayne';
              if (hour >= 12 && hour < 16) return 'Good afternoon, Mr. Wayne';
              return 'Good evening, Mr. Wayne';
            })()}
          </h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <SpecularButton 
              className={isListening ? 'pulsing listening' : ''}
              onMouseDown={startListening}
              onMouseUp={stopListening}
              onMouseLeave={stopListening}
              onTouchStart={startListening}
              onTouchEnd={stopListening}
              size="md" radius={18} tint="#ffffff" tintOpacity={0} blur={0} textColor="#f5f5f5" lineColor="#ffffff" baseColor="#525252" intensity={1} shineSize={10} shineFade={40} thickness={1} speed={0.35} followMouse proximity={250} autoAnimate={false}
            >
              <span style={{ fontFamily: "'Pinyon Script', cursive", fontSize: '26px' }}>
                {isListening ? 'Listening...' : 'Talk to Alfred (Ctrl+M)'}
              </span>
            </SpecularButton>
            <SpecularButton 
              className={`${isGenerating ? 'pulsing' : ''} ${isPlaying ? 'playing' : ''}`}
              onMouseDown={startListening}
              onMouseUp={stopListening}
              onMouseLeave={stopListening}
              onTouchStart={startListening}
              onTouchEnd={stopListening}
              size="md" radius={18} tint="#ffffff" tintOpacity={0} blur={0} textColor="#f5f5f5" lineColor="#ffffff" baseColor="#525252" intensity={1} shineSize={10} shineFade={40} thickness={1} speed={0.35} followMouse proximity={250} autoAnimate={false}
            >
              <span style={{ fontFamily: "'Pinyon Script', cursive", fontSize: '26px' }}>
                {isGenerating ? 'Thinking...' : isPlaying ? 'Speaking...' : "Alfred's Rundown"}
              </span>
            </SpecularButton>
          </div>
        </header>

        <form onSubmit={submitChat} style={{ display: 'flex', gap: '10px', marginBottom: chatResponse ? '15px' : '30px', padding: '15px', background: 'rgba(20, 20, 20, 0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <input 
            value={chatInput} 
            onChange={(e) => setChatInput(e.target.value)} 
            placeholder='Type or say "what was my latest GitHub push?"' 
            style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px 15px', borderRadius: '8px', fontSize: '16px', outline: 'none' }}
          />
          <div style={{ opacity: chatInput.trim() ? 1 : 0.5 }}>
            <SpecularButton 
              type="submit" 
              disabled={!chatInput.trim() || isGenerating}
              size="md" radius={18} tint="#ffffff" tintOpacity={0} blur={0} textColor="#f5f5f5" lineColor="#ffffff" baseColor="#525252" intensity={1} shineSize={10} shineFade={40} thickness={1} speed={0.35} followMouse proximity={250} autoAnimate={false}
            >
              Send
            </SpecularButton>
          </div>
        </form>

        {chatResponse && (
          <div style={{ textAlign: 'center', marginBottom: '30px', padding: '15px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <span style={{ color: '#3b82f6', marginRight: '10px', fontWeight: 'bold' }}>Alfred says:</span>
            <strong style={{ fontSize: '18px', color: 'white' }}>{chatResponse}</strong>
          </div>
        )}

        <div className="dashboard-grid">
          {/* Streaks Panel */}
          <div className="section glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2>Habits & Streaks</h2>
              <div style={{ width: '80px' }}>
                <SpecularButton onClick={() => addStreak()} size="sm" radius={12} tint="#ffffff" tintOpacity={0} blur={0} textColor="#f5f5f5" lineColor="#ffffff" baseColor="#525252" intensity={1} shineSize={10} shineFade={40} thickness={1} speed={0.35} followMouse proximity={250} autoAnimate={false}>Add</SpecularButton>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
              {streaks.map(streak => {
                const today = new Date().toISOString().split('T')[0];
                const isCompletedToday = streak.last_completed_date === today;
                const progress = isCompletedToday ? 1 : 0;
                
                return (
                  <StreakRing
                    key={streak.id}
                    size={80}
                    strokeWidth={8}
                    color={streak.color}
                    progress={progress}
                    title={streak.title}
                    currentStreak={streak.current_streak}
                    longestStreak={streak.longest_streak}
                    onClick={() => toggleStreak(streak)}
                  />
                );
              })}
              {streaks.length === 0 && <p className="empty-state">No habits tracked yet.</p>}
            </div>
          </div>

          {/* Chores Panel */}
          <div className="section glass-panel">
            <h2>Daily Chores</h2>
            <form onSubmit={addChore} className="add-chore-form">
              <input value={newChore} onChange={(e) => setNewChore(e.target.value)} placeholder="Add a new chore..." />
              <SpecularButton type="submit" size="sm" radius={18} tint="#ffffff" tintOpacity={0} blur={0} textColor="#f5f5f5" lineColor="#ffffff" baseColor="#525252" intensity={1} shineSize={10} shineFade={40} thickness={1} speed={0.35} followMouse proximity={250} autoAnimate={false}>Add</SpecularButton>
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
          
          {/* Reminders Panel */}
          <div className="section glass-panel">
            <h2>Meetings & Reminders</h2>
            <form onSubmit={addReminder} className="add-chore-form" style={{ flexDirection: 'column' }}>
              <input value={newReminder} onChange={(e) => setNewReminder(e.target.value)} placeholder="Meeting / Reminder Title" />
              <input type="datetime-local" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px 15px', borderRadius: '8px', outline: 'none' }} />
              <div style={{ marginTop: '10px' }}>
                <SpecularButton type="submit" size="md" radius={18} tint="#ffffff" tintOpacity={0} blur={0} textColor="#f5f5f5" lineColor="#ffffff" baseColor="#525252" intensity={1} shineSize={10} shineFade={40} thickness={1} speed={0.35} followMouse proximity={250} autoAnimate={false}>Add Schedule</SpecularButton>
              </div>
            </form>
            <ul className="list">
              {reminders.map(rem => (
                <li key={rem.id} className="data-item reminder-item">
                  <div className="item-info">
                    <strong>{rem.title}</strong>
                    <span className="subtitle">{new Date(rem.due_date).toLocaleString()}</span>
                  </div>
                  <button className="delete-btn" onClick={() => deleteReminder(rem.id)}>✕</button>
                </li>
              ))}
              {reminders.length === 0 && <p className="empty-state">No upcoming meetings or reminders.</p>}
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
              {github.length === 0 && <p className="empty-state">No recent repository activity.</p>}
            </ul>
          </div>

          {/* Sticky Notes Panel */}
          <div className="section glass-panel sticky-notes-board">
            <h2>Add Sticky Note</h2>
            <form onSubmit={addStickyNote} className="add-chore-form" style={{ flexDirection: 'column', gap: '8px', marginBottom: '0px', alignItems: 'stretch' }}>
              <input value={newStickyTitle} onChange={(e) => setNewStickyTitle(e.target.value)} placeholder="Sticky Note Title..." />
              <textarea 
                value={newStickyContent} 
                onChange={(e) => setNewStickyContent(e.target.value)} 
                placeholder="Content..." 
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.2)', color: 'white', minHeight: '60px', fontFamily: 'inherit', resize: 'vertical' }} 
              />
              <div style={{ alignSelf: 'flex-end' }}>
                <SpecularButton type="submit" size="md" radius={18} tint="#ffffff" tintOpacity={0} blur={0} textColor="#000000" lineColor="#ffffff" baseColor="#eab308" intensity={1} shineSize={10} shineFade={40} thickness={1} speed={0.35} followMouse proximity={250} autoAnimate={false}>Add Sticky</SpecularButton>
              </div>
            </form>
          </div>

        </div>

        {/* Floating Sticky Notes Container */}
        {stickyNotes.length > 0 && (
          <div className="sticky-notes-grid">
            {stickyNotes.map((note) => (
              <div key={note.id} className="sticky-note">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ color: '#000' }}>{note.title}</strong>
                  <button onClick={() => deleteStickyNote(note.id)} style={{ background: 'transparent', color: '#dc2626', border: 'none', padding: 0, fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>
                <p style={{ color: '#333', fontSize: '14px', margin: 0, whiteSpace: 'pre-wrap' }}>{note.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Obsidian Graph (Full Width) */}
        <div style={{ marginTop: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ color: '#aaa', fontSize: '18px', margin: 0 }}>Obsidian Vault Graph</h2>
            <div style={{ width: '150px' }}>
              <SpecularButton onClick={refreshGraph} disabled={isSyncing} size="sm" radius={12} tint="#ffffff" tintOpacity={0} blur={0} textColor="#f5f5f5" lineColor="#ffffff" baseColor="#525252" intensity={1} shineSize={10} shineFade={40} thickness={1} speed={0.35} followMouse proximity={250} autoAnimate={false}>{isSyncing ? 'Syncing...' : 'Sync to GitHub'}</SpecularButton>
            </div>
          </div>
          <div style={{ width: '100%', height: '600px', background: 'rgba(20,20,20,0.6)', backdropFilter: 'blur(12px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
            {graphData.nodes.length > 0 ? (
              <ForceGraph2D
                graphData={graphData}
                width={windowWidth > 1200 ? 1160 : windowWidth - 40}
                height={600}
                backgroundColor="transparent"
                linkColor={() => 'rgba(255,255,255,0.2)'}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  const label = node.id;
                  const fontSize = 12 / globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  
                  // Draw Node
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
                  ctx.fillStyle = '#d1d5db'; // Tailwind gray-300
                  ctx.fill();
                
                  // Draw Text
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'top';
                  ctx.fillStyle = '#9ca3af'; // Tailwind gray-400
                  ctx.fillText(label, node.x, node.y + 6);
                }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Loading Graph...</div>
            )}
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
