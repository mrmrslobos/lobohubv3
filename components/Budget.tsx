
import React, { useState, useMemo } from 'react';
import { AppState, Transaction } from '../types';
import { CATEGORIES } from '../constants';
import { useAuth } from './AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface BudgetProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const Budget: React.FC<BudgetProps> = ({ state, setState }) => {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [newTx, setNewTx] = useState({ description: '', amount: 0, type: 'EXPENSE' as 'INCOME' | 'EXPENSE', category: 'Groceries' });

  const summary = useMemo(() => {
    const income = state.transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const expenses = state.transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [state.transactions]);

  const pieData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    state.transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  }, [state.transactions]);

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const addTransaction = () => {
    if (!newTx.description || newTx.amount <= 0) return;
    const tx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      ...newTx,
      date: new Date().toISOString(),
      userId: user?.id || '1'
    };
    setState(prev => ({ ...prev, transactions: [tx, ...prev.transactions] }));
    setIsAdding(false);
    setNewTx({ description: '', amount: 0, type: 'EXPENSE', category: 'Groceries' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Budget Tracker</h2>
          <p className="text-slate-400">Keep the family finances in check.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-green-600 hover:bg-green-500 px-6 py-2.5 rounded-full font-bold transition-all shadow-lg shadow-green-600/20"
        >
          + Add Entry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Total Balance</p>
          <p className={`text-4xl font-bold mt-1 ${summary.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${summary.balance.toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold text-green-500">Income</p>
          <p className="text-4xl font-bold mt-1 text-slate-100">
            ${summary.income.toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold text-red-500">Expenses</p>
          <p className="text-4xl font-bold mt-1 text-slate-100">
            ${summary.expenses.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl min-h-[400px]">
          <h3 className="text-lg font-bold mb-6">Spending by Category</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[300px] flex items-center justify-center text-slate-500 italic">No data to display.</div>}
        </div>

        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl">
          <h3 className="text-lg font-bold mb-6">Recent Transactions</h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {state.transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl ${
                    tx.type === 'INCOME' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {tx.type === 'INCOME' ? '↓' : '↑'}
                  </div>
                  <div>
                    <p className="font-semibold">{tx.description}</p>
                    <p className="text-xs text-slate-500">{tx.category} • {new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className={`font-bold ${tx.type === 'INCOME' ? 'text-green-400' : 'text-slate-100'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 space-y-6 shadow-2xl">
            <h3 className="text-2xl font-bold">Add Transaction</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => setNewTx(prev => ({...prev, type: 'EXPENSE'}))}
                  className={`flex-1 py-2 rounded-xl font-bold transition-all ${newTx.type === 'EXPENSE' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                >Expense</button>
                <button 
                  onClick={() => setNewTx(prev => ({...prev, type: 'INCOME'}))}
                  className={`flex-1 py-2 rounded-xl font-bold transition-all ${newTx.type === 'INCOME' ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                >Income</button>
              </div>
              <input 
                type="text" 
                placeholder="Description"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                value={newTx.description}
                onChange={e => setNewTx(prev => ({ ...prev, description: e.target.value }))}
              />
              <input 
                type="number" 
                placeholder="Amount"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                value={newTx.amount || ''}
                onChange={e => setNewTx(prev => ({ ...prev, amount: Number(e.target.value) }))}
              />
              <select 
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                value={newTx.category}
                onChange={e => setNewTx(prev => ({ ...prev, category: e.target.value }))}
              >
                {CATEGORIES.BUDGET.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsAdding(false)} className="flex-1 py-3 text-slate-400 font-bold hover:text-white transition-colors">Cancel</button>
              <button onClick={addTransaction} className="flex-1 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition-colors">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;
