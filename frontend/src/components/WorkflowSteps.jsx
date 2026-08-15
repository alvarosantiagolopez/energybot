const STEPS = [
  'Receiving invoice...',
  'Extracting data with AI...',
  'Loading history...',
  'Analyzing consumption...',
  'Generating recommendations...',
];

/**
 * Displays the invoice processing pipeline steps, checking off each one as
 * `activeIndex` advances. The backend processes the request as a single call,
 * so progress here is simulated to give the user visibility into the pipeline.
 */
function WorkflowSteps({ activeIndex, failed }) {
  return (
    <ul className="workflow-steps">
      {STEPS.map((label, index) => {
        let state = 'pending';
        if (failed && index === activeIndex) state = 'failed';
        else if (index < activeIndex) state = 'done';
        else if (index === activeIndex) state = 'active';

        return (
          <li key={label} className={`workflow-step workflow-step--${state}`}>
            <span className="workflow-step__icon">
              {state === 'done' && '✓'}
              {state === 'active' && '●'}
              {state === 'failed' && '!'}
              {state === 'pending' && '○'}
            </span>
            <span className="workflow-step__label">{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default WorkflowSteps;
export { STEPS };
