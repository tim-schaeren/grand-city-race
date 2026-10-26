import { useLocation, useNavigate } from 'react-router-dom';
import { consoleCopy as cc } from '@grandcityrace/shared';
import Icon from '../components/Icon';
import { Button } from '../ui/Button';
import { setGuideStep, useGuideStep } from './guide';
import { useReadiness, type Step } from './readiness';

// Guided mode: the checklist one step at a time, above whatever page the host
// is on. The guide leads: it brings the host to each step's page, and moves
// on when they're done there. Leaving it changes nothing; the pages are the same.
export function GuideBar({ gameId }: { gameId: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const stepIndex = useGuideStep(gameId);
  const { game, steps } = useReadiness(gameId);
  if (stepIndex === null || !game || game.endedAt || steps.length === 0) return null;

  const goTo = (index: number) => {
    setGuideStep(gameId, index);
    if (index < steps.length) navigate(steps[index].to);
  };
  const leave = <Button size="small" tone="quiet" onClick={() => setGuideStep(gameId, null)}>{cc.guide.leave}</Button>;

  if (stepIndex >= steps.length) {
    return (
      <Bar>
        <span className="flex-1 font-medium text-indigo-950">{cc.guide.done}</span>
        <Button size="small" tone="primary" onClick={() => setGuideStep(gameId, null)}>{cc.guide.finish}</Button>
      </Bar>
    );
  }

  const step = steps[stepIndex];
  const next: Step | undefined = steps[stepIndex + 1];
  const here = pathname === step.to.split('#')[0];
  return (
    <Bar>
      <span className="min-w-0 flex-1">
        <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-indigo-500">{cc.guide.step({ n: stepIndex + 1, of: steps.length })}</span>
        <span className="font-medium text-indigo-950">
          {step.done && <Icon name="check" size={14} className="mr-1 text-green-700" />}
          {step.title}
        </span>
        <span className="block text-indigo-900/80">{step.done ? cc.guide.stepDone : step.why}</span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        {stepIndex > 0 && <Button size="small" tone="quiet" onClick={() => goTo(stepIndex - 1)}>{cc.guide.back}</Button>}
        {!here && <Button size="small" onClick={() => navigate(step.to)}>{cc.guide.backToStep}</Button>}
        {step.done ? (
          <Button size="small" tone="primary" onClick={() => goTo(stepIndex + 1)}>
            {next ? cc.guide.next({ step: next.title }) : cc.guide.finishAll}
          </Button>
        ) : (
          <Button size="small" tone="quiet" onClick={() => goTo(stepIndex + 1)}>{cc.guide.skip}</Button>
        )}
        {leave}
      </span>
    </Bar>
  );
}

function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm md:px-8">
      {children}
    </div>
  );
}
