export function CustomerSectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
  compact = false,
}: {
  eyebrow: string
  title: string
  description?: string
  centered?: boolean
  compact?: boolean
}) {
  return (
    <div
      className={`section-title-wrap customer-section-heading${centered ? ' customer-section-heading--centered' : ''}${compact ? ' customer-section-heading--compact' : ''}`}
    >
      <span className="sub-title">{eyebrow}</span>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  )
}
