import React, { useState, useEffect } from 'react';
import { Recipe } from '../types/recipe';
import { X, ChevronLeft, ChevronRight, CheckCircle2, Play, Pause, RotateCcw, Volume2, Sparkles, ChefHat } from 'lucide-react';

interface RecipeCookingModeProps {
  recipe: Recipe;
  onClose: () => void;
}

export const RecipeCookingMode: React.FC<RecipeCookingModeProps> = ({ recipe, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // Kitchen Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerPresetMinutes, setTimerPresetMinutes] = useState(5);

  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerActive) {
      setTimerActive(false);
      // Play soft beep audio
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.8);
      } catch (e) {
        // Audio might be muted or unsupported
      }
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const steps = recipe.steps || [];
  const currentStep = steps[currentStepIndex];
  const progressPercent = steps.length > 0 ? Math.round(((currentStepIndex + 1) / steps.length) * 100) : 0;

  const toggleStepDone = (idx: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const startPresetTimer = (minutes: number) => {
    setTimerSeconds(minutes * 60);
    setTimerActive(true);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md flex flex-col justify-between text-white p-3.5 sm:p-6 md:p-8 pb-safe animate-in fade-in duration-200 overflow-y-auto">
      {/* Top Bar */}
      <header className="flex items-center justify-between pb-3 sm:pb-4 border-b border-stone-800 gap-2 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <ChefHat className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-amber-400 uppercase tracking-wider block">Modo Cocina</span>
            <h2 className="text-sm sm:text-lg font-bold text-stone-100 font-display truncate">
              {recipe.title}
            </h2>
          </div>
        </div>

        <button
          onClick={onClose}
          className="min-w-[42px] min-h-[42px] flex items-center justify-center rounded-full bg-stone-800 hover:bg-stone-700 active:scale-90 text-stone-300 hover:text-white transition-all shrink-0"
          title="Salir del modo cocina"
          aria-label="Salir del modo cocina"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-stone-800/80 rounded-full h-2 my-3 sm:my-4 overflow-hidden shrink-0">
        <div
          className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Step Display */}
      <main className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full my-auto py-3 sm:py-4">
        {currentStep ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs sm:text-sm tracking-wide">
                Paso {currentStepIndex + 1} de {steps.length}
              </span>

              <button
                onClick={() => toggleStepDone(currentStepIndex)}
                className={`min-h-[40px] flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
                  completedSteps[currentStepIndex]
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                }`}
              >
                <CheckCircle2
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    completedSteps[currentStepIndex] ? 'text-emerald-400 fill-emerald-400/20' : 'text-stone-500'
                  }`}
                />
                <span>{completedSteps[currentStepIndex] ? 'Paso hecho' : 'Marcar como hecho'}</span>
              </button>
            </div>

            {/* Step text in large readable typography */}
            <p className="text-lg sm:text-2xl md:text-3xl font-medium text-stone-100 leading-relaxed font-sans text-balance">
              {currentStep.instruction}
            </p>

            {/* Tip card if exists */}
            {currentStep.tip && (
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-950/40 border border-amber-600/30 flex items-start gap-2.5 sm:gap-3 text-amber-200">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-base leading-snug">
                  <span className="font-bold text-amber-300 block mb-0.5">Consejo del Peludo:</span>
                  {currentStep.tip}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-stone-400">Esta receta aún no tiene pasos definidos.</p>
          </div>
        )}
      </main>

      {/* Integrated Kitchen Timer Helper Bar */}
      <section className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3 sm:p-4 max-w-3xl mx-auto w-full mb-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="font-mono text-xl sm:text-3xl font-bold tracking-wider text-amber-400 bg-stone-950 px-3 py-1 rounded-xl border border-stone-800 min-w-[76px] text-center">
              {formatTimer(timerSeconds)}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTimerActive(!timerActive)}
                disabled={timerSeconds === 0}
                className="min-w-[42px] min-h-[42px] p-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-medium transition-all flex items-center justify-center active:scale-90"
                title={timerActive ? 'Pausar' : 'Iniciar'}
                aria-label="Iniciar/pausar temporizador"
              >
                {timerActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                onClick={() => {
                  setTimerActive(false);
                  setTimerSeconds(0);
                }}
                className="min-w-[42px] min-h-[42px] p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-all flex items-center justify-center active:scale-90"
                title="Reiniciar temporizador"
                aria-label="Reiniciar temporizador"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Quick preset timer buttons: 38px touch targets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-stone-400 mr-1 hidden sm:inline">Avisador:</span>
            {[2, 5, 10, 15, 20].map((min) => (
              <button
                key={min}
                onClick={() => startPresetTimer(min)}
                className="min-h-[38px] px-2.5 py-1 text-xs rounded-lg bg-stone-800 hover:bg-amber-600/30 hover:text-amber-300 text-stone-300 border border-stone-700/60 font-semibold transition-colors active:scale-95"
              >
                +{min}m
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Step Navigation Controls */}
      <footer className="flex items-center justify-between max-w-3xl mx-auto w-full pt-1 shrink-0 gap-2">
        <button
          onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentStepIndex === 0}
          className="min-h-[48px] flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none font-bold text-xs sm:text-base transition-colors active:scale-95"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Anterior</span>
        </button>

        <span className="text-stone-400 text-xs sm:text-sm font-semibold">
          {currentStepIndex + 1} / {steps.length}
        </span>

        {currentStepIndex < steps.length - 1 ? (
          <button
            onClick={() => setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
            className="min-h-[48px] flex items-center gap-1.5 px-5 sm:px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-xs sm:text-base text-white shadow-lg shadow-amber-900/40 transition-all active:scale-95"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        ) : (
          <button
            onClick={onClose}
            className="min-h-[48px] flex items-center gap-1.5 px-5 sm:px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs sm:text-base text-white shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
          >
            <span>¡Terminado!</span>
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
      </footer>
    </div>
  );
};
