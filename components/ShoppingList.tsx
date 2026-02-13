
import React, { useState, useMemo } from 'react';
import { AppState, ShoppingItem } from '../types';
import { CATEGORIES } from '../constants';
import { useAuth } from './AuthContext';

interface ShoppingListProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ state, setState }) => {
  const { user } = useAuth();
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState(CATEGORIES.SHOPPING[0]);

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName) return;
    const newItem: ShoppingItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: itemName,
      quantity: '1',
      category: itemCategory,
      purchased: false,
      requestedBy: user?.id || '1'
    };
    setState(prev => ({ ...prev, shoppingItems: [newItem, ...prev.shoppingItems] }));
    setItemName('');
  };

  const toggleItem = (id: string) => {
    setState(prev => ({
      ...prev,
      shoppingItems: prev.shoppingItems.map(i => i.id === id ? { ...i, purchased: !i.purchased } : i)
    }));
  };

  const removeItem = (id: string) => {
    setState(prev => ({
      ...prev,
      shoppingItems: prev.shoppingItems.filter(i => i.id !== id)
    }));
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    state.shoppingItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [state.shoppingItems]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Shopping List</h2>
          <p className="text-slate-400">Keep the pantry stocked for the pack.</p>
        </div>
        <form onSubmit={addItem} className="flex gap-2">
          <input 
            type="text" 
            placeholder="Add something..." 
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none flex-1"
            value={itemName}
            onChange={e => setItemName(e.target.value)}
          />
          <select 
            className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            value={itemCategory}
            onChange={e => setItemCategory(e.target.value)}
          >
            {CATEGORIES.SHOPPING.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl font-bold">+</button>
        </form>
      </div>

      <div className="space-y-8">
        {/* Fix: Explicitly cast Object.entries to ensure 'items' is treated as an array of ShoppingItem */}
        {(Object.entries(groupedItems) as [string, ShoppingItem[]][]).map(([category, items]) => (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2">
              {category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(item => (
                <div 
                  key={item.id} 
                  className={`group p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    item.purchased 
                      ? 'bg-slate-900/20 border-slate-900/50 opacity-50' 
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1" onClick={() => toggleItem(item.id)}>
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-colors ${
                      item.purchased ? 'bg-green-500 border-green-500' : 'border-slate-700 group-hover:border-blue-500'
                    }`}>
                      {item.purchased && <span className="text-slate-900 text-sm font-bold">✓</span>}
                    </div>
                    <div>
                      <p className={`font-medium ${item.purchased ? 'line-through' : ''}`}>{item.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase">Requested by {state.users.find(u => u.id === item.requestedBy)?.name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-400 transition-opacity"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {state.shoppingItems.length === 0 && (
          <div className="text-center py-12 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
            <p className="text-slate-500">The pantry is full! Time to relax.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingList;
