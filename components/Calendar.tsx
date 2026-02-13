
import React, { useState } from 'react';
import { AppState, CalendarEvent } from '../types';
import { CATEGORIES } from '../constants';

interface CalendarProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const Calendar: React.FC<CalendarProps> = ({ state, setState }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', category: 'Family' as any });

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const startOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendar = () => {
    const days = [];
    const numDays = daysInMonth(selectedDate);
    const startDay = startOfMonth(selectedDate);

    // Padding for start day
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-slate-900/10 border border-slate-800/30 rounded-xl" />);
    }

    for (let d = 1; d <= numDays; d++) {
      const dayDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d);
      const isToday = dayDate.toDateString() === new Date().toDateString();
      const events = state.events.filter(e => new Date(e.start).toDateString() === dayDate.toDateString());

      days.push(
        <div key={d} className={`h-24 p-2 border border-slate-800 rounded-xl transition-all hover:bg-slate-800/50 cursor-pointer ${isToday ? 'bg-blue-600/10 border-blue-600/50 ring-1 ring-blue-600/50' : 'bg-slate-900/50'}`}>
          <span className={`text-sm font-bold ${isToday ? 'text-blue-400' : 'text-slate-500'}`}>{d}</span>
          <div className="mt-1 space-y-1 overflow-y-auto h-16">
            {events.map(e => (
              <div key={e.id} className="text-[10px] px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded truncate border border-blue-600/30">
                {e.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Family Calendar</h2>
          <p className="text-slate-400">Sync schedules for every member of the pack.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-1 rounded-xl flex items-center border border-slate-800">
            <button 
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
              className="p-2 hover:bg-slate-800 rounded-lg"
            >←</button>
            <span className="px-4 font-bold min-w-[140px] text-center">
              {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button 
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
              className="p-2 hover:bg-slate-800 rounded-lg"
            >→</button>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-full font-bold shadow-lg shadow-blue-600/20"
          >+ Event</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 uppercase tracking-widest px-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {renderCalendar()}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 space-y-6 shadow-2xl">
            <h3 className="text-2xl font-bold">New Event</h3>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Event Title"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                value={newEvent.title}
                onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
              />
              <select 
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                value={newEvent.category}
                onChange={e => setNewEvent(prev => ({ ...prev, category: e.target.value as any }))}
              >
                {CATEGORIES.CALENDAR.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsAdding(false)} className="flex-1 py-3 text-slate-400 font-bold hover:text-white transition-colors">Cancel</button>
              <button 
                onClick={() => {
                  const event: CalendarEvent = {
                    id: Math.random().toString(36).substr(2, 9),
                    title: newEvent.title,
                    start: selectedDate.toISOString(),
                    end: selectedDate.toISOString(),
                    assignedTo: ['1'],
                    category: newEvent.category
                  };
                  setState(prev => ({ ...prev, events: [...prev.events, event] }));
                  setIsAdding(false);
                }}
                className="flex-1 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition-colors"
              >Add Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
