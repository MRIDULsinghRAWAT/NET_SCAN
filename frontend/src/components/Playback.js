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
      <div className="w-full p-5 text-center" style={{
        background: 'rgba(2, 16, 36, 0.5)',
        border: '1px solid rgba(84, 131, 179, 0.15)',
        borderRadius: '16px',
        backdropFilter: 'blur(14px)',
      }}>
        <div className="text-sm" style={{color: '#5483B3'}}>No attack simulation data available. Run a scan to see the attack path playback.</div>
      </div>
    );
  }

  const activeStep = currentStep >= 0 ? steps[currentStep] : null;
  const progress = currentStep >= 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const TargetIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
  const ShuffleIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>;
  const ObjectiveIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

  const actionStyle = {
    INITIAL_ACCESS: { color: '#5483B3', bg: 'rgba(84, 131, 179, 0.15)', icon: <TargetIcon/>, label: 'INITIAL ACCESS' },
    LATERAL_MOVE:   { color: '#7DA0CA', bg: 'rgba(125, 160, 202, 0.15)', icon: <ShuffleIcon/>, label: 'LATERAL MOVE' },
    OBJECTIVE:      { color: '#C1E8FF', bg: 'rgba(193, 232, 255, 0.15)', icon: <ObjectiveIcon/>, label: 'OBJECTIVE' },
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden" style={{
      background: 'rgba(2, 16, 36, 0.45)',
      border: '1px solid rgba(84, 131, 179, 0.15)',
      backdropFilter: 'blur(18px)',
      boxShadow: '0 0 50px rgba(5, 38, 89, 0.4), 0 8px 32px rgba(2, 16, 36, 0.6)',
    }}>
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 py-3" style={{
        borderBottom: '1px solid rgba(84, 131, 179, 0.15)',
        background: 'linear-gradient(90deg, rgba(5, 38, 89, 0.4) 0%, rgba(2, 16, 36, 0.5) 100%)',
        backdropFilter: 'blur(12px)',
      }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{background: '#5483B3'}} />
          <span className="font-bold text-sm tracking-widest" style={{color: '#C1E8FF'}}>ATTACK PATH PLAYBACK</span>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{color: '#5483B3'}}>
          <span>Path Risk:</span>
          <span className="font-bold text-base" style={{color: '#C1E8FF'}}>{simulation?.total_risk || 0}</span>
          <span className="mx-1">|</span>
          <span>{simulation?.path_type?.toUpperCase() || 'DEADLIEST'} PATH</span>
        </div>
      </div>

      {/* ─── Visual Path Progress (Node Timeline) ─── */}
      <div className="px-4 py-4" style={{
        borderBottom: '1px solid rgba(84, 131, 179, 0.12)',
        background: 'linear-gradient(90deg, rgba(5, 38, 89, 0.2) 0%, transparent 100%)',
      }}>
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2" style={{zIndex: 0}}>
            <div className="h-full rounded-full" style={{background: 'rgba(84, 131, 179, 0.15)'}} />
            <div
              className="h-full rounded-full absolute top-0 left-0 transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #5483B3, #7DA0CA, #C1E8FF)',
              }}
            />
          </div>

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
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500 ${
                    isCurrent
                      ? 'scale-125'
                      : isPast
                      ? 'opacity-80'
                      : 'opacity-30'
                  }`}
                  style={{
                    borderColor: isCurrent || isPast ? style.color : 'rgba(84, 131, 179, 0.2)',
                    background: isCurrent ? style.bg : isPast ? 'rgba(5, 38, 89, 0.3)' : 'rgba(2, 16, 36, 0.6)',
                    color: isCurrent || isPast ? style.color : '#5483B3',
                    boxShadow: isCurrent ? `0 0 20px ${style.color}40` : 'none',
                  }}
                >
                  {isCurrent ? style.icon : isPast ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : idx + 1}
                </div>

                <div className={`mt-2 text-center transition-all duration-300 ${
                  isCurrent ? 'opacity-100' : isPast ? 'opacity-60' : 'opacity-25'
                }`}>
                  <div className="text-xs font-bold truncate max-w-20" style={{ color: style.color }}>
                    {step.service}
                  </div>
                  <div className="text-xs" style={{color: '#5483B3'}}>Port {step.port}</div>
                </div>

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
      <div className="flex items-center gap-3 px-4 py-3" style={{
        borderBottom: '1px solid rgba(84, 131, 179, 0.12)',
        background: 'linear-gradient(90deg, rgba(5, 38, 89, 0.2) 0%, transparent 100%)',
      }}>
        <button
          onClick={handleStepBack}
          disabled={currentStep <= 0}
          className="glass-btn w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold disabled:opacity-20 disabled:cursor-not-allowed"
          title="Step Back"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"/><rect x="5" y="4" width="2" height="16"/></svg>
        </button>

        <button
          onClick={playing ? handlePause : handlePlay}
          className="glass-btn-primary w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold transition-all"
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft: '4px'}}><polygon points="5 3 19 12 5 21 5 3"/></svg>
          )}
        </button>

        <button
          onClick={handleStepForward}
          disabled={currentStep >= totalSteps - 1}
          className="glass-btn w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold disabled:opacity-20 disabled:cursor-not-allowed"
          title="Step Forward"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><rect x="17" y="4" width="2" height="16"/></svg>
        </button>

        <button
          onClick={currentStep >= 0 || playing ? handleReset : handlePlay}
          className="glass-btn px-4 py-2 rounded-lg text-xs font-bold tracking-wider flex items-center gap-1.5"
          title={currentStep >= 0 || playing ? 'Reset' : 'Play'}
        >
          {currentStep >= 0 || playing ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              RESET
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              PLAY
            </>
          )}
        </button>

        <div className="ml-auto flex items-center gap-3">
          <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{background: 'rgba(5, 38, 89, 0.5)'}}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #5483B3, #7DA0CA, #C1E8FF)',
              }}
            />
          </div>
          <span className="text-xs font-mono" style={{color: '#5483B3'}}>
            {currentStep >= 0 ? currentStep + 1 : 0} / {totalSteps}
          </span>
        </div>
      </div>

      {/* ─── Active Step Detail ─── */}
      {activeStep ? (
        <div className="px-4 py-4" style={{background: 'rgba(2, 16, 36, 0.3)'}}>
          <div className="flex items-start gap-4">
            <div
              className="shrink-0 px-3 py-2 rounded-lg text-sm font-bold tracking-wider flex items-center gap-2"
              style={{
                background: (actionStyle[activeStep.action] || actionStyle.LATERAL_MOVE).bg,
                color: (actionStyle[activeStep.action] || actionStyle.LATERAL_MOVE).color,
                border: `1px solid ${(actionStyle[activeStep.action] || actionStyle.LATERAL_MOVE).color}40`,
              }}
            >
              {(actionStyle[activeStep.action] || actionStyle.LATERAL_MOVE).icon}
              {(actionStyle[activeStep.action] || actionStyle.LATERAL_MOVE).label}
            </div>

            <div className="flex-1">
              <div className="text-sm mb-2" style={{color: '#C1E8FF'}}>{activeStep.description}</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {activeStep.mitre_id && (
                  <span className="px-2 py-1 rounded-lg font-mono text-xs font-bold" style={{background: 'rgba(84, 131, 179, 0.25)', color: '#7DA0CA', border: '1px solid rgba(84, 131, 179, 0.3)'}}>
                    {activeStep.mitre_id}
                  </span>
                )}
                {activeStep.technique && (
                  <span className="px-2 py-1 rounded-lg text-xs" style={{background: 'rgba(84, 131, 179, 0.15)', color: '#5483B3'}}>
                    {activeStep.technique}
                  </span>
                )}
                {activeStep.category && (
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    activeStep.category === 'credential_reuse' ? 'bg-red-900/40 text-red-300' :
                    activeStep.category === 'exploitation' ? 'bg-orange-900/40 text-orange-300' :
                    activeStep.category === 'exfiltration' ? 'bg-purple-900/40 text-purple-300' :
                    ''
                  }`} style={['tunneling', 'discovery'].includes(activeStep.category) ? {background: 'rgba(84,131,179,0.25)', color: '#C1E8FF'} : {}}>
                    {activeStep.category?.replace('_', ' ').toUpperCase()}
                  </span>
                )}
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                  activeStep.risk === 'Critical' ? 'bg-red-900/40 text-red-300' :
                  activeStep.risk === 'High' ? 'bg-orange-900/40 text-orange-300' :
                  'text-yellow-300'
                }`} style={activeStep.risk !== 'Critical' && activeStep.risk !== 'High' ? {background: 'rgba(234,179,8,0.15)'} : {}}>
                  {activeStep.risk} RISK
                </span>
              </div>
            </div>
          </div>

          {activeStep.edge_description && (
            <div className="mt-3 px-3 py-2 rounded-lg text-xs" style={{
              background: 'rgba(5, 38, 89, 0.35)',
              border: '1px solid rgba(84, 131, 179, 0.15)',
              color: '#7DA0CA',
            }}>
              <span className="font-bold mr-2" style={{color: '#C1E8FF'}}>HOW:</span>
              {activeStep.edge_description}
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-sm flex flex-col items-center" style={{background: 'rgba(2, 16, 36, 0.3)', color: '#5483B3'}}>
          <div className="text-xl mb-3" style={{color: '#7DA0CA'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <div>Press <span className="font-bold" style={{color: '#C1E8FF'}}>Play</span> to simulate the deadliest attack path through your network</div>
        </div>
      )}
    </div>
  );
};

export default Playback;
