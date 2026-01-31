
import React, { useState } from 'react';

interface Props {
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Welcome to TimeXP 🚀",
    content: "Welcome, Commander! TimeXP is your mission control for academic success. Let's get you briefed on the basic systems.",
    icon: "🛰️"
  },
  {
    title: "The Mission Timeline",
    content: "Your main dashboard shows your planned operations for today. Sync them to earn XP and level up your rank!",
    icon: "📅"
  },
  {
    title: "Earn XP & Rewards",
    content: "Complete missions to earn XP. Planned missions give 50 XP, while spontaneous 'off-blueprint' tasks give 25 XP.",
    icon: "⚡"
  },
  {
    title: "Blueprint Planning",
    content: "Head to the 'Schedule' tab to draft your weekly blueprint. Tactical Intel AI will analyze it to give you a strategic edge.",
    icon: "🗺️"
  }
];

export const OnboardingTour: React.FC<Props> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" />
      <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-12 relative animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-5xl mb-8">
            {step.icon}
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">{step.title}</h2>
          <p className="text-slate-500 font-bold leading-relaxed mb-10">{step.content}</p>
          
          <div className="flex gap-2 mb-10">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-200'}`} />
            ))}
          </div>

          <button 
            onClick={next}
            className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-indigo-700 transition shadow-xl"
          >
            {currentStep === STEPS.length - 1 ? "Begin Mission 🚀" : "Next Protocol →"}
          </button>
        </div>
      </div>
    </div>
  );
};
