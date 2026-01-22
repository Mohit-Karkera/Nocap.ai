import React, { useState } from 'react';

interface Props {
  onLogin: (username: string) => void;
}

const Auth: React.FC<Props> = ({ onLogin }) => {
  const [name, setName] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full space-y-4">
        <h1 className="text-2xl font-black text-slate-900">
          NoCap<span className="text-indigo-600">.ai</span>
        </h1>
        <p className="text-slate-500 text-sm">
          Pick an agent name to start verifying news.
        </p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter a username"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => name.trim() && onLogin(name.trim())}
          className="w-full bg-slate-900 text-white rounded-xl py-2 text-xs font-black uppercase tracking-widest hover:bg-slate-800"
        >
          Enter Lab
        </button>
      </div>
    </div>
  );
};

export default Auth;
