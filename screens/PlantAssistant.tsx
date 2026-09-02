
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { askPlantExpert } from '../services/geminiService';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const PlantAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: '¡Hola! Soy tu asistente de plantas 🌱. Pregúntame lo que necesites: riego, abono, plagas, remedios caseros, dosis…'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const answer = await askPlantExpert(q);
      setMessages(prev => [...prev, { role: 'assistant', text: answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ Error: ${err instanceof Error ? err.message : 'Error desconocido'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="flex h-screen flex-col bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-black/5 dark:border-white/5 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-card-dark text-text-main-light dark:text-text-main-dark border border-black/5 dark:border-white/10 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">Asistente de plantas</h1>
          <p className="text-xs text-text-sec-light dark:text-text-sec-dark">Pregúntame cualquier duda de cuidado</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-black rounded-br-md' : 'bg-white dark:bg-card-dark text-text-main-light dark:text-text-main-dark border border-black/5 dark:border-white/10 rounded-bl-md'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-white dark:bg-card-dark border border-black/5 dark:border-white/10 text-text-sec-light dark:text-text-sec-dark">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 bg-primary rounded-full animate-pulse"></span>
                <span className="size-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                <span className="size-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                Escribiendo…
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-black/5 dark:border-white/5 p-3 pb-6 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: ¿cómo preparo el jabón potásico?"
            className="flex-1 h-12 rounded-xl px-4 text-sm bg-gray-100 dark:bg-card-dark text-text-main-light dark:text-text-main-dark outline-none border border-black/5 dark:border-white/10 focus:border-primary"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="flex size-12 items-center justify-center rounded-xl bg-primary text-black active:scale-95 transition-all disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[24px]">send</span>
          </button>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">Respuestas informativas. Ante plagas graves, consulta a un especialista.</p>
      </div>
    </div>
  );
};

export default PlantAssistant;
