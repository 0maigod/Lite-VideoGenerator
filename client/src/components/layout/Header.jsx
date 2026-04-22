import React from 'react';

export default function Header({ hasInteracted }) {
    return (
        <header className={`w-full flex ${hasInteracted ? 'justify-between items-center mb-8 px-4 md:px-8 max-w-[1400px]' : 'flex-col items-center mb-4 text-center max-w-4xl'} transition-all duration-700 mx-auto`}>
            <div className={`flex flex-col ${hasInteracted ? '' : 'items-center'}`}>
                <h1 className={`font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent transition-all duration-700 ${hasInteracted ? 'text-2xl tracking-widest' : 'text-2xl md:text-4xl mb-3'}`}>
                    {hasInteracted ? 'GIG' : 'Gemini Image Generator'}
                </h1>
            </div>
            {hasInteracted && (
                <div className="font-bold text-white text-lg animate-in fade-in slide-in-from-right-4 duration-700 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-black shadow-lg shadow-purple-500/20">FZ</div>
                </div>
            )}
        </header>
    );
}
