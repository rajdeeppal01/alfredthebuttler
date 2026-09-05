import { useState, useEffect } from 'react';
import './App.css';
import PrivacyPolicy from './PrivacyPolicy';
import TermsConditions from './TermsConditions';
import Antigravity from '@/components/Antigravity';

interface Chore {
  id: number;
  title: string;
  completed: boolean;
}

function App() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [newChore, setNewChore] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const fetchChores = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/chores');
      const data = await res.json();
      setChores(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchChores();
  }, []);

  const addChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChore.trim()) return;

    await fetch('http://127.0.0.1:8000/chores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newChore })
    });
    setNewChore('');
    fetchChores();
  };

  const toggleChore = async (id: number, completed: boolean) => {
    await fetch(`http://127.0.0.1:8000/chores/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed })
    });
    fetchChores();
  };

  const deleteChore = async (id: number) => {
    await fetch(`http://127.0.0.1:8000/chores/${id}`, {
      method: 'DELETE'
    });
    fetchChores();
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
      <div className="dashboard glass-panel">
        <h1>Daily Assistant</h1>
        
        <div className="section">
          <h2>My Chores</h2>
          <form onSubmit={addChore} className="add-chore-form">
            <input 
              value={newChore} 
              onChange={(e) => setNewChore(e.target.value)} 
              placeholder="Add a new chore..." 
            />
            <button type="submit">Add</button>
          </form>

          <ul className="chore-list">
            {chores.map(chore => (
              <li key={chore.id} className={chore.completed ? 'completed' : ''}>
                <div className="chore-info" onClick={() => toggleChore(chore.id, chore.completed)}>
                  <div className={`checkbox ${chore.completed ? 'checked' : ''}`}></div>
                  <span>{chore.title}</span>
                </div>
                <button className="delete-btn" onClick={() => deleteChore(chore.id)}>✕</button>
              </li>
            ))}
            {chores.length === 0 && <p className="empty-state">No chores for today!</p>}
          </ul>
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
