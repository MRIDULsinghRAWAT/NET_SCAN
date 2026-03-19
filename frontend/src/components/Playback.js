import React, { useState, useEffect, useRef } from 'react';

/**
 * Playback Component
 * ─────────────────────
 * Animates the deadliest attack path step-by-step with Play / Pause / Reset
 * controls and a visual path progress indicator showing Entry → Pivot → Target.
 */
const Playback = ({ simulation, graphData }) => {
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const timerRef = useRef(null);

  const steps = simulation?.steps || [];
  const totalSteps = steps.length;

  // Auto-advance when playing
  useEffect(() => {
    if (playing && totalSteps > 0) {
      timerRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const next = prev + 1;
          if (next >= totalSteps) {
            setPlaying(false);
            return totalSteps - 1;
          }
          return next;
        });
      }, 2500);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, totalSteps]);

  const handlePlay = () => {
    if (currentStep >= totalSteps - 1) setCurrentStep(0);
    else if (currentStep < 0) setCurrentStep(0);
    setPlaying(true);
  };
  const handlePause = () => setPlaying(false);
  const handleReset = () => { setPlaying(false); setCurrentStep(-1); };
  const handleStepForward = () => {
    if (currentStep < totalSteps - 1) setCurrentStep(s => s + 1);
  };
  const handleStepBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  if (!steps || totalSteps === 0) {
    return (
      <div className="w-full bg-black/80 border border-gray-800 rounded-lg p-5 text-center">
        <div className="text-gray-500 text-sm">No attack simulation data available. Run a scan to see the attack path playback.</div>
      </div>
    );
  }

  const activeStep = currentStep >= 0 ? steps[currentStep] : null;
  const progress = currentStep >= 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  // Determine action colors/icons
  const actionStyle = {
    INITIAL_ACCESS: { color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', icon: '🎯', label: 'INITIAL ACCESS' },
    LATERAL_MOVE:   { color: '#eab308', bg: 'rgba(234,179,8,0.15)', icon: '🔀', label: 'LATERAL MOVE' },
    OBJECTIVE:      { color: '#a855f7', bg: 'rgba(168,85,247,0.15)', icon: '💀', label: 'OBJECTIVE' },
  };

  return (
    <div className="w-full bg-black border border-red-900/40 rounded-lg overflow-hidden">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-red-900/30 bg-gradient-to-r from-red-950/40 to-black">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 font-bold text-sm tracking-widest">ATTACK PATH PLAYBACK</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Path Risk:</span>
          <span className="text-red-400 font-bold text-base">{simulation?.total_risk || 0}</span>
          <span className="mx-1">|</span>
          <span>{simulation?.path_type?.toUpperCase() || 'DEADLIEST'} PATH</span>
        </div>
      </div>

      {/* ─── Visual Path Progress (Node Timeline) ─── */}
      <div className="px-4 py-4 border-b border-red-900/20 bg-black/60">
        <div className="flex items-center justify-between relative">
          {/* Connecting line behind nodes */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2" style={{zIndex: 0}}>
            <div className="h-full bg-gray-800 rounded-full" />
            <div
              className="h-full rounded-full absolute top-0 left-0 transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #06b6d4, #eab308, #a855f7)',
              }}
            />
          </div>

          {/* Step Nodes */}
          {steps.map((step, idx) => {
            const isCurrent = idx === currentStep;
            const isPast = idx < currentStep;
            const style = actionStyle[step.action] || actionStyle.LATERAL_MOVE;

            return (
              <div
                key={idx}
                className="relative flex flex-col items-center cursor-pointer transition-all duration-300"
                style={{ zIndex: 1, flex: 1 }}
                onClick={() => { setCurrentStep(idx); setPlaying(false); }}
              >
                {/* Node circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500 ${
                    isCurrent
                      ? 'scale-125 shadow-lg shadow-current'
                      : isPast
                      ? 'opacity-80'
                      : 'opacity-30'
                  }`}
                  style={{
                    borderColor: isCurrent || isPast ? style.color : '#333',
                    background: isCurrent ? style.bg : isPast ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.6)',
                    color: isCurrent || isPast ? style.color : '#555',
                    boxShadow: isCurrent ? `0 0 20px ${style.color}40` : 'none',
                  }}
                >
                  {isCurrent ? style.icon : isPast ? '✓' : idx + 1}
                </div>

                {/* Service label */}
                <div className={`mt-2 text-center transition-all duration-300 ${
                  isCurrent ? 'opacity-100' : isPast ? 'opacity-60' : 'opacity-25'
                }`}>
                  <div className="text-xs font-bold truncate max-w-20" style={{ color: style.color }}>
                    {step.service}
                  </div>
                  <div className="text-xs text-gray-500">Port {step.port}</div>
                </div>

                {/* Role badge */}
                <div className={`mt-1 px-1.5 py-0.5 rounded text-xs font-bold transition-all ${
                  isCurrent ? 'opacity-100' : 'opacity-0'
                }`} style={{ background: style.bg, color: style.color, fontSize: '9px' }}>
                  {step.role?.toUpperCase()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Controls Bar ─── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-red-900/20 bg-black/40">
        {/* Step Back */}
        <button
          onClick={handleStepBack}
          disabled={currentStep <= 0}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          title="Step Back"
        >
          ⏮
        </button>

        {/* Play / Pause */}
        <button
          onClick={playing ? handlePause : handlePlay}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all shadow-lg ${
            playing
              ? 'bg-yellow-600 hover:bg-yellow-500 text-black shadow-yellow-600/30'
              : 'bg-green-600 hover:bg-green-500 text-black shadow-green-600/30'
          }`}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? '⏸' : '▶'}
        </button>

        {/* Step Forward */}
        <button
          onClick={handleStepForward}
          disabled={currentStep >= totalSteps - 1}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          title="Step Forward"
        >
          ⏭
        </button>

        {/* Reset */}
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-full bg-red-900/60 hover:bg-red-800 text-red-300 text-xs font-bold tracking-wider transition-colors border border-red-800/40"
          title="Reset"
        >
          ↺ RESET
        </button>

        {/* Progress text */}
        <div className="ml-auto flex items-center gap-3">
          {/* Progress bar */}
          <div className="w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #06b6d4, #eab308, #a855f7)',
              }}
            />
          </div>
          <span className="text-gray-400 text-xs font-mono">
            {currentStep >= 0 ? currentStep + 1 : 0} / {totalSteps}
          </span>
        </div>
      </div>

      {/* ─── Active Step Detail ─── */}
      {activeStep ? (
        <div className="px-4 py-4 bg-black/30">
          <div className="flex items-start gap-4">
            {/* Action Badge */}
            <div
              className="shrink-0 px-3 py-2 rounded-lg text-sm font-bold tracking-wider"
              style={{
                background: (actionStyle[activeStep.action] || actionStyle.LATERAL_MOVE).bg,
                color: (actionStyle[activeStep.action] || actionStyle.LATERAL_MOVE).color,
                border: `1px solid ${(actionStyle[activeStep.action] || actionStyle.LATERAL_MOVE).color}40`,
              }}
            >
              {(actionStyle[activeStep.action] || actionStyle.LATERAL_MOVE).icon}{' '}
              {(actionStyle[activeStep.action] || actionStyle.LATERAL_MOVE).label}
            </div>

            {/* Description */}
            <div className="flex-1">
              <div className="text-gray-200 text-sm mb-2">{activeStep.description}</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {activeStep.mitre_id && (
                  <span className="px-2 py-1 rounded bg-purple-900/50 text-purple-300 text-xs font-mono font-bold border border-purple-700/40">
                    {activeStep.mitre_id}
                  </span>
                )}
                {activeStep.technique && (
                  <span className="px-2 py-1 rounded bg-purple-900/30 text-purple-400 text-xs">
                    {activeStep.technique}
                  </span>
                )}
                {activeStep.category && (
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    activeStep.category === 'credential_reuse' ? 'bg-red-900/40 text-red-300' :
                    activeStep.category === 'exploitation' ? 'bg-orange-900/40 text-orange-300' :
                    activeStep.category === 'tunneling' ? 'bg-blue-900/40 text-blue-300' :
                    activeStep.category === 'exfiltration' ? 'bg-purple-900/40 text-purple-300' :
                    'bg-gray-800 text-gray-300'
                  }`}>
                    {activeStep.category?.replace('_', ' ').toUpperCase()}
                  </span>
                )}
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  activeStep.risk === 'Critical' ? 'bg-red-900/40 text-red-300' :
                  activeStep.risk === 'High' ? 'bg-orange-900/40 text-orange-300' :
                  'bg-yellow-900/40 text-yellow-300'
                }`}>
                  {activeStep.risk} RISK
                </span>
              </div>
            </div>
          </div>

          {/* Edge description (how the attacker moved FROM previous step) */}
          {activeStep.edge_description && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-800 text-xs text-gray-400">
              <span className="text-yellow-400 font-bold mr-2">HOW:</span>
              {activeStep.edge_description}
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-gray-500 text-sm bg-black/30">
          <div className="text-xl mb-2">▶</div>
          Press <span className="text-green-400 font-bold">Play</span> to simulate the deadliest attack path through your network
        </div>
      )}
    </div>
  );
};

export default Playback;
