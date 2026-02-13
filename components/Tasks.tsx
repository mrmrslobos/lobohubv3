
import React, { useState } from 'react';
import { AppState, Task, TaskPriority } from '../types';
import { useAuth } from './AuthContext';

interface TasksProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const Tasks: React.FC<TasksProps> = ({ state, setState }) => {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', assignedTo: user?.id || '1', priority: TaskPriority.MEDIUM });

  const addTask = () => {
    if (!newTask.title) return;
    const task: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTask.title,
      priority: newTask.priority,
      assignedTo: newTask.assignedTo,
      completed: false,
      createdBy: user?.id || '1',
      dueDate: new Date().toISOString()
    };
    setState(prev => ({ ...prev, tasks: [...prev.tasks, task] }));
    setNewTask({ title: '', assignedTo: user?.id || '1', priority: TaskPriority.MEDIUM });
    setIsAdding(false);
  };

  const toggleTask = (id: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    }));
  };

  const deleteTask = (id: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id)
    }));
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Task Board</h2>
          <p className="text-slate-400">Manage chores and family projects.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-full font-bold transition-all shadow-lg shadow-blue-600/20"
        >
          + New Task
        </button>
      </div>

      {isAdding && (
        <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl shadow-2xl space-y-4">
          <h3 className="font-bold text-lg">Create New Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input 
              type="text" 
              placeholder="What needs to be done?"
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 col-span-1 md:col-span-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={newTask.title}
              onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
            />
            <select 
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={newTask.priority}
              onChange={e => setNewTask(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
            >
              <option value={TaskPriority.LOW}>Low Priority</option>
              <option value={TaskPriority.MEDIUM}>Medium Priority</option>
              <option value={TaskPriority.HIGH}>High Priority</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
            <button onClick={addTask} className="bg-blue-600 px-6 py-2 rounded-xl font-bold">Create Task</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* To Do Column */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            🚀 In Progress ({state.tasks.filter(t => !t.completed).length})
          </h3>
          <div className="space-y-3">
            {state.tasks.filter(t => !t.completed).map(task => (
              <div key={task.id} className="group bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 hover:border-slate-600 transition-all">
                <button 
                  onClick={() => toggleTask(task.id)}
                  className="w-6 h-6 rounded-full border-2 border-slate-700 flex items-center justify-center text-transparent hover:border-blue-500 transition-colors"
                >
                  ✓
                </button>
                <div className="flex-1">
                  <p className="font-medium">{task.title}</p>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      task.priority === TaskPriority.HIGH ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      task.priority === TaskPriority.MEDIUM ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                      'bg-green-500/10 text-green-400 border-green-500/20'
                    }`}>
                      {task.priority}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      👤 {state.users.find(u => u.id === task.assignedTo)?.name}
                    </span>
                  </div>
                </div>
                <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition-all">
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Completed Column */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            ✅ Completed ({state.tasks.filter(t => t.completed).length})
          </h3>
          <div className="space-y-3 opacity-60">
            {state.tasks.filter(t => t.completed).map(task => (
              <div key={task.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                <button 
                  onClick={() => toggleTask(task.id)}
                  className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-slate-950 font-bold"
                >
                  ✓
                </button>
                <div className="flex-1">
                  <p className="font-medium line-through text-slate-500">{task.title}</p>
                </div>
                <button onClick={() => deleteTask(task.id)} className="p-2 text-slate-500 hover:text-red-400">
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tasks;
