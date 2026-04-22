import React, { useRef } from 'react';
import { LIGHTING_STYLES } from '../../constants/lightingStyles';

export default function LightingCarousel({
    isEditing,
    useLighting,
    selectedLighting,
    setSelectedLighting
}) {
    const carouselRef = useRef(null);

    const handleCarouselMouseMove = (e) => {
        if (!carouselRef.current) return;
        const container = carouselRef.current;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const paddedPercentage = (x / rect.width - 0.1) / 0.8; 
        const percentage = Math.max(0, Math.min(1, paddedPercentage));
        
        const maxScroll = container.scrollWidth - container.clientWidth;
        container.scrollLeft = maxScroll * percentage;
    };

    if (isEditing || !useLighting) return null;

    return (
        <div className="w-full bg-slate-900/40 rounded-xl border border-white/5 p-4 mt-2 transition-all duration-300">
            <div 
                ref={carouselRef}
                onMouseMove={handleCarouselMouseMove}
                className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden group/carousel"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {LIGHTING_STYLES.map((style) => (
                    <div
                        key={style.id}
                        onClick={() => setSelectedLighting(style.id)}
                        className={`flex flex-col items-center gap-2 cursor-pointer group shrink-0 w-20 transition-all duration-300 ${selectedLighting === style.id ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-100'}`}
                    >
                        <div className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-300 ${selectedLighting === style.id ? 'border-[#fb5607] shadow-lg shadow-[#fb5607]/20' : 'border-transparent group-hover:border-slate-500'}`}>
                            <img src={style.image} alt={style.name} className="w-full h-full object-cover" />
                        </div>
                        <span className={`text-[10px] text-center leading-tight font-medium ${selectedLighting === style.id ? 'text-[#fb5607]' : 'text-slate-400'}`}>
                            {style.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
