type TimelineStepState = 'complete' | 'current' | 'pending'

export type CustomerTimelineStep = {
  id: string
  label: string
  description: string
  timestamp: string
  state: TimelineStepState
}

export function CustomerTimeline({
  steps,
}: {
  steps: CustomerTimelineStep[]
}) {
  return (
    <ol className="customer-timeline">
      {steps.map((step, index) => (
        <li key={step.id} className={`customer-timeline__item customer-timeline__item--${step.state}`}>
          <div className="customer-timeline__marker" aria-hidden="true">
            {step.state === 'complete' ? <span>✓</span> : null}
          </div>
          {index < steps.length - 1 ? <div className="customer-timeline__line" aria-hidden="true" /> : null}
          <div className="customer-timeline__content">
            <div className="customer-timeline__header">
              <h4>{step.label}</h4>
              <span>{step.timestamp}</span>
            </div>
            <p>{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
