import { useState, useEffect, useRef } from 'react';
import './App.css';
import PrivacyPolicy from './PrivacyPolicy';
import TermsConditions from './TermsConditions';
// @ts-ignore
import Particles from './components/Particles';
import ForceGraph2D from 'react-force-graph-2d';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Loader2, Sparkles, Send, Trash2, 
  CheckCircle2, Circle, Mail, Code2, StickyNote, Calendar, Plus
} from 'lucide-react';

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
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stickyNotes, setStickyNotes] = useState<any[]>([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newStickyTitle, setNewStickyTitle] = useState('');
  const [newStickyContent, setNewStickyContent] = useState('');
  const [newReminder, setNewReminder] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  
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

      const [choresData, emailsData, githubData, obsidianData, remindersData, stickyNotesData, graphDataRes] = await Promise.all([
        fetchSafely(`${API_URL}/chores`),
        fetchSafely(`${API_URL}/emails`),
        fetchSafely(`${API_URL}/projects/github`),
        fetchSafely(`${API_URL}/projects/obsidian`),
        fetchSafely(`${API_URL}/reminders`),
        fetchSafely(`${API_URL}/sticky_notes`),
        fetchSafely(`${API_URL}/projects/obsidian/graph`)
      ]);

      setChores(choresData);
      setEmails(emailsData);
      setGithub(githubData);
      setObsidian(obsidianData);
      setReminders(remindersData);
      setStickyNotes(stickyNotesData);
      setGraphData(graphDataRes);
      
      return { chores: choresData, emails: emailsData, github: githubData, obsidian: obsidianData, reminders: remindersData, stickyNotes: stickyNotesData };
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  useEffect(() => {
    fetchData().then((data) => {
      if (data) autoGreet(data);
    });
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
        const audio = new Audio(audioUrl);
        audio.play().catch(e => console.log("Autoplay blocked.", e));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const triggerRundown = async () => {
    if (isGenerating || isPlaying) return;
    setIsGenerating(true);

    try {
      const contextData = { chores, emails, github, obsidian, reminders };
      const res = await fetch(`${API_URL}/generate_rundown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: "generate", context: contextData })
      });
      const data = await res.json();
      
      const audioUrl = `${API_URL}/voice/play?text=${encodeURIComponent(data.greeting)}`;
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

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      setChatInput(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
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
          context: { chores, emails, github, obsidian }
        })
      });
      
      if (!res.ok) {
        setChatResponse(`Server Error: ${res.status}.`);
        setIsGenerating(false);
        return;
      }
      
      const data = await res.json();
      setChatResponse(data.response);
      fetchData();
      
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
      setChatResponse(`Network Error.`);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        triggerRundown();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        startListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chores, emails, github, isGenerating, isPlaying, isListening]);

  // CRUD Handlers
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
      <div className="fixed top-0 left-0 w-screen h-screen -z-10">
        <Particles
          particleColors={["#6366f1", "#a855f7", "#ffffff"]}
          particleCount={150}
          particleSpread={15}
          speed={0.15}
          particleBaseSize={120}
          moveParticlesOnHover={true}
          alphaParticles={true}
        />
      </div>
      
      <div className="max-w-7xl mx-auto p-4 md:p-8 relative z-10 pb-20">
        {/* Header */}
        <header className="glass-panel flex flex-col md:flex-row justify-between items-center gap-6 mb-8 py-5 px-8">
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400 m-0">
            Assistant Dashboard
          </h1>
          <div className="flex gap-4">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all shadow-lg shadow-indigo-500/25 ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 border border-slate-600'}`}
              onClick={startListening}
            >
              {isListening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4 text-indigo-400" />}
              {isListening ? 'Listening...' : 'Talk (Ctrl+M)'}
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all shadow-lg ${isGenerating ? 'bg-indigo-600/50' : isPlaying ? 'bg-emerald-500 shadow-emerald-500/25' : 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-indigo-500/25'}`}
              onClick={triggerRundown}
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? 'Thinking...' : isPlaying ? 'Speaking...' : 'Morning Rundown'}
            </motion.button>
          </div>
        </header>

        {/* Chat Box */}
        <form onSubmit={submitChat} className="flex gap-3 mb-8 p-3 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
          <div className="relative flex-1">
            <input 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              placeholder='Ask Alfred anything...' 
              className="w-full bg-black/20 border border-white/5 text-white pl-4 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
            />
          </div>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            type="submit" 
            disabled={!chatInput.trim() || isGenerating} 
            className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:opacity-50 text-white px-6 rounded-xl transition-colors"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </form>

        <AnimatePresence>
          {chatResponse && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-6 bg-indigo-900/20 backdrop-blur-md rounded-2xl border border-indigo-500/30 text-center shadow-[0_0_30px_rgba(99,102,241,0.15)]"
            >
              <span className="text-indigo-400 font-bold mr-3 uppercase tracking-wider text-sm">Alfred:</span>
              <span className="text-lg text-white font-medium">{chatResponse}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chores */}
          <div className="glass-panel flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle2 className="text-indigo-400 w-5 h-5" />
              <h2 className="text-lg font-semibold text-slate-200 m-0">Daily Chores</h2>
            </div>
            <form onSubmit={addChore} className="flex gap-2 mb-5">
              <input 
                value={newChore} 
                onChange={(e) => setNewChore(e.target.value)} 
                placeholder="Add a new chore..." 
                className="flex-1 bg-black/20 border border-white/10 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button type="submit" className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"><Plus className="w-5 h-5 text-indigo-300" /></button>
            </form>
            <ul className="flex flex-col gap-3 m-0 p-0">
              <AnimatePresence>
                {chores.map(chore => (
                  <motion.li 
                    key={chore.id} 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-between items-center bg-white/5 border border-white/5 p-3 rounded-xl group hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleChore(chore.id, chore.completed)}>
                      {chore.completed ? 
                        <CheckCircle2 className="text-emerald-400 w-5 h-5" /> : 
                        <Circle className="text-slate-400 w-5 h-5 group-hover:text-indigo-400 transition-colors" />
                      }
                      <span className={`${chore.completed ? 'line-through text-slate-500' : 'text-slate-200'} transition-all`}>{chore.title}</span>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-400 text-slate-400 transition-all" onClick={() => deleteChore(chore.id)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
              {chores.length === 0 && <p className="text-slate-500 italic text-sm text-center py-4">No chores for today!</p>}
            </ul>
          </div>

          {/* Emails */}
          <div className="glass-panel flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <Mail className="text-violet-400 w-5 h-5" />
              <h2 className="text-lg font-semibold text-slate-200 m-0">Unread Emails</h2>
            </div>
            <ul className="flex flex-col gap-3 m-0 p-0">
              <AnimatePresence>
                {emails.map(email => (
                  <motion.li 
                    key={email.id} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col bg-white/5 border border-white/5 p-4 rounded-xl"
                  >
                    <strong className="text-slate-200 mb-1 leading-tight">{email.subject}</strong>
                    <span className="text-xs text-indigo-300 font-medium mb-2">{email.sender}</span>
                    <p className="text-sm text-slate-400 line-clamp-2 m-0 leading-relaxed">{email.snippet.replace(/&quot;/g, '"').replace(/&#39;/g, "'")}</p>
                  </motion.li>
                ))}
              </AnimatePresence>
              {emails.length === 0 && <p className="text-slate-500 italic text-sm text-center py-4">Inbox Zero!</p>}
            </ul>
          </div>
          
          {/* Reminders Panel */}
          <div className="glass-panel flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <Calendar className="text-emerald-400 w-5 h-5" />
              <h2 className="text-lg font-semibold text-slate-200 m-0">Meetings & Reminders</h2>
            </div>
            <form onSubmit={addReminder} className="flex flex-col gap-3 mb-5">
              <input 
                value={newReminder} 
                onChange={(e) => setNewReminder(e.target.value)} 
                placeholder="Meeting Title..." 
                className="bg-black/20 border border-white/10 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <div className="flex gap-2">
                <input 
                  type="datetime-local" 
                  value={newDueDate} 
                  onChange={(e) => setNewDueDate(e.target.value)} 
                  className="flex-1 bg-black/20 border border-white/10 text-white px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50" 
                />
                <button type="submit" className="bg-emerald-600/80 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl transition-colors">Add</button>
              </div>
            </form>
            <ul className="flex flex-col gap-3 m-0 p-0">
              <AnimatePresence>
                {reminders.map(rem => (
                  <motion.li 
                    key={rem.id} 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex justify-between items-center bg-white/5 border border-white/5 p-4 rounded-xl group"
                  >
                    <div className="flex flex-col">
                      <strong className="text-slate-200 mb-1">{rem.title}</strong>
                      <span className="text-xs text-emerald-300 bg-emerald-500/10 self-start px-2 py-0.5 rounded-full">{new Date(rem.due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-400 text-slate-400 transition-all" onClick={() => deleteReminder(rem.id)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
              {reminders.length === 0 && <p className="text-slate-500 italic text-sm text-center py-4">No upcoming events.</p>}
            </ul>
          </div>

          {/* GitHub Panel */}
          <div className="glass-panel flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <Code2 className="text-slate-300 w-5 h-5" />
              <h2 className="text-lg font-semibold text-slate-200 m-0">Latest GitHub Pushes</h2>
            </div>
            <ul className="flex flex-col gap-3 m-0 p-0">
              <AnimatePresence>
                {github.map((notif, idx) => (
                  <motion.li 
                    key={idx} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex flex-col bg-white/5 border border-white/5 p-4 rounded-xl relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-violet-500"></div>
                    <strong className="text-slate-200 mb-1 ml-2">{notif.repository}</strong>
                    <span className="text-xs text-slate-400 ml-2 mb-2 uppercase tracking-wide">{notif.type}</span>
                    <p className="text-sm text-indigo-200 m-0 ml-2">{notif.title}</p>
                  </motion.li>
                ))}
              </AnimatePresence>
              {github.length === 0 && <p className="text-slate-500 italic text-sm text-center py-4">No recent repository activity.</p>}
            </ul>
          </div>

          {/* Sticky Notes Panel */}
          <div className="glass-panel flex flex-col lg:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <StickyNote className="text-amber-400 w-5 h-5" />
              <h2 className="text-lg font-semibold text-slate-200 m-0">Sticky Notes</h2>
            </div>
            
            <form onSubmit={addStickyNote} className="flex flex-col md:flex-row gap-3 mb-6">
              <input 
                value={newStickyTitle} 
                onChange={(e) => setNewStickyTitle(e.target.value)} 
                placeholder="Note Title..." 
                className="bg-black/20 border border-white/10 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/50 md:w-1/3"
              />
              <div className="flex flex-1 gap-2">
                <input 
                  value={newStickyContent} 
                  onChange={(e) => setNewStickyContent(e.target.value)} 
                  placeholder="Quick thought..." 
                  className="flex-1 bg-black/20 border border-white/10 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/50" 
                />
                <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-2 rounded-xl transition-colors shadow-lg shadow-amber-500/20">Stick It</button>
              </div>
            </form>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <AnimatePresence>
                {stickyNotes.map((note, idx) => {
                  const colors = ['bg-amber-200', 'bg-rose-200', 'bg-emerald-200', 'bg-cyan-200', 'bg-fuchsia-200'];
                  const colorClass = colors[idx % colors.length];
                  const rotate = (idx % 3 === 0) ? 'rotate-2' : (idx % 2 === 0) ? '-rotate-2' : 'rotate-1';
                  
                  return (
                    <motion.div 
                      key={note.id} 
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
                      className={`${colorClass} ${rotate} p-4 rounded-md shadow-md text-slate-900 min-h-[120px] flex flex-col transition-transform cursor-pointer`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <strong className="font-bold text-sm leading-tight">{note.title}</strong>
                        <button onClick={() => deleteStickyNote(note.id)} className="text-black/40 hover:text-red-600 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs m-0 whitespace-pre-wrap flex-1">{note.content}</p>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
            {stickyNotes.length === 0 && <p className="text-slate-500 italic text-sm text-center py-4">No sticky notes yet.</p>}
          </div>

          {/* Obsidian Panel */}
          <div className="glass-panel flex flex-col lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-purple-500 flex items-center justify-center"><span className="text-white text-xs font-bold">O</span></div>
                <h2 className="text-lg font-semibold text-slate-200 m-0">Obsidian Vault</h2>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Column: Add Note & Graph */}
              <div className="flex-1 flex flex-col gap-5">
                <form onSubmit={addNote} className="flex flex-col gap-3 bg-black/10 p-4 rounded-xl border border-white/5">
                  <h3 className="text-sm font-semibold text-slate-300 m-0 mb-1">Push to GitHub</h3>
                  <input 
                    value={newNoteTitle} 
                    onChange={(e) => setNewNoteTitle(e.target.value)} 
                    placeholder="Note Title..." 
                    className="bg-black/30 border border-white/5 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500/50"
                  />
                  <textarea 
                    value={newNoteContent} 
                    onChange={(e) => setNewNoteContent(e.target.value)} 
                    placeholder="Markdown content..." 
                    className="bg-black/30 border border-white/5 text-white px-3 py-2 rounded-lg outline-none focus:border-purple-500/50 min-h-[80px]"
                  />
                  <button type="submit" className="bg-purple-600/80 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors self-end text-sm">Sync to Vault</button>
                </form>
                
                <div className="h-[300px] bg-black/40 rounded-xl border border-white/10 overflow-hidden relative shadow-inner">
                  {graphData.nodes.length > 0 ? (
                    <ForceGraph2D
                      graphData={graphData}
                      width={600}
                      height={300}
                      nodeAutoColorBy="group"
                      nodeLabel="id"
                      linkDirectionalParticles={2}
                      linkDirectionalParticleSpeed={0.01}
                      backgroundColor="transparent"
                      nodeRelSize={6}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Mapping Vault...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Recent Notes List */}
              <div className="flex-1 flex flex-col">
                <h3 className="text-sm font-semibold text-slate-300 m-0 mb-3">Recently Modified</h3>
                <ul className="flex flex-col gap-3 m-0 p-0 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence>
                    {obsidian.map((note, idx) => (
                      <motion.li 
                        key={idx} 
                        initial={{ opacity: 0, x: 10 }} 
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col bg-white/5 border border-white/5 p-4 rounded-xl hover:bg-white/10 transition-colors cursor-default"
                      >
                        <strong className="text-purple-300 mb-1">{note.title}</strong>
                        <p className="text-sm text-slate-400 line-clamp-3 m-0 leading-relaxed">{note.snippet}</p>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                  {obsidian.length === 0 && <p className="text-slate-500 italic text-sm text-center py-4">No recent notes found.</p>}
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-6 z-20 bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
        <button className="text-slate-400 hover:text-white text-xs font-medium transition-colors" onClick={() => setShowPrivacy(true)}>Privacy Policy</button>
        <button className="text-slate-400 hover:text-white text-xs font-medium transition-colors" onClick={() => setShowTerms(true)}>Terms & Conditions</button>
      </footer>

      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      {showTerms && <TermsConditions onClose={() => setShowTerms(false)} />}
    </>
  );
}

export default App;
