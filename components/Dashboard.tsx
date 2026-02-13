
import React, { useMemo, useState } from 'react';
import { AppState, TaskPriority } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
// Fix: Import GoogleGenAI to enable AI assistant features using the latest Gemini SDK
import { GoogleGenAI } from "@google/genai";

interface DashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  // Fix: Add states for the AI advice content and loading status
  const [advice, setAdvice] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  const pendingTasks = useMemo(() => state.tasks.filter(t => !t.completed), [state.tasks]);
  const upcomingEvents = useMemo(() => {
    return state.events
      .filter(e => new Date(e.start) >= new Date())
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 3);
  }, [state.events]);

  const budgetSummary = useMemo(() => {
    const income = state.transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const expenses = state.transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [state.transactions]);

  const chartData = useMemo(() => [
    { name: 'Income', amount: budgetSummary.income, color: '#10b981' },
    { name: 'Expenses', amount: budgetSummary.expenses, color: '#ef4444' }
  ], [budgetSummary]);

  // Fix: Implement function to query Gemini API for personalized family management advice
  const handleAskAdvice = async () => {
    setIsAsking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `You are the "Lobo AI Assistant", a highly intelligent family coordinator for "The Lobo Pack".
      Analyze the current family data and provide a single, punchy, and encouraging tip (max 2 sentences).
      
      Family Context:
      - Tasks Pending: ${pendingTasks.length} (Key Task: "${pendingTasks.find(t => t.priority === TaskPriority.HIGH)?.title || 'None'}")
      - Upcoming Events: ${upcomingEvents.length} (Next: "${upcomingEvents[0]?.title || 'None'}")
      - Budget: $${budgetSummary.balance.toLocaleString()} remaining.
      - Shopping Needs: ${state.shoppingItems.filter(i => !i.purchased).length} items.
      
      Respond with a friendly but professional tone. Use pack/wolf metaphors occasionally.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      if (response.text) {
        setAdvice(response.text);
      }
    } catch (error) {
      console.error("Lobo AI error:", error);
      setAdvice("The pack is busy today! Focus on clearing high-priority tasks and checking the shopping list before the next event.");
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold">Welcome back, Pack!</h1>
        <p className="text-slate-400 mt-1">Here is what is happening today in the Lobo household.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📅</span> Upcoming Events
          </h3>
          <div className="space-y-4">
            {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
              <div key={event.id} className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <p className="font-medium text-blue-400">{event.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(event.start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            )) : <p className="text-slate-500 text-sm italic">No upcoming events.</p>}
          </div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📝</span> Pending Tasks
          </h3>
          <div className="space-y-3">
            {pendingTasks.slice(0, 4).map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                <div className={`w-2 h-2 rounded-full ${
                  task.priority === TaskPriority.HIGH ? 'bg-red-500' :
                  task.priority === TaskPriority.MEDIUM ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <span className="text-sm font-medium flex-1 truncate">{task.title}</span>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 bg-slate-700 px-2 py-1 rounded">
                  {state.users.find(u => u.id === task.assignedTo)?.name.split(' ')[0]}
                </span>
              </div>
            ))}
            {pendingTasks.length > 4 && (
              <p className="text-center text-xs text-slate-500 font-medium">+{pendingTasks.length - 4} more tasks</p>
            )}
            {pendingTasks.length === 0 && <p className="text-slate-500 text-sm italic">All caught up!</p>}
          </div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-xl col-span-1 md:col-span-2 lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>💰</span> Budget Snapshot
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: '#1e293b'}} 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-between items-center px-2">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Balance</p>
              <p className={`text-xl font-bold ${budgetSummary.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${budgetSummary.balance.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Exp.</p>
              <p className="text-xl font-bold text-slate-300">
                ${budgetSummary.expenses.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shopping list snippet */}
        <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span>🛒</span> Shopping List
            </h3>
            <span className="text-xs font-medium px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
              {state.shoppingItems.filter(i => !i.purchased).length} items left
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {state.shoppingItems.filter(i => !i.purchased).slice(0, 6).map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-2xl border border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                <div className="w-2 h-2 rounded-full bg-slate-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-500">{item.quantity} • {item.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fix: Integrated Lobo AI Assistant with Gemini API */}
        <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-6 rounded-3xl border border-blue-500/30 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 text-9xl opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">🐺</div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <span>✨</span> Lobo AI Assistant
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">
            {advice ? advice : `"The pack is waiting for your leadership! Ask me for a quick summary of how to optimize your day."`}
          </p>
          <button 
            onClick={handleAskAdvice}
            disabled={isAsking}
            className={`px-6 py-2.5 bg-white text-slate-950 rounded-full text-sm font-bold hover:bg-slate-200 transition-colors shadow-lg flex items-center gap-2 ${isAsking ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isAsking ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Thinking...
              </>
            ) : 'Ask for Advice'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
