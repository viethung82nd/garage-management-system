export function CustomerSectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string
  title: string
  description?: string
  centered?: boolean
}) {
  return (
    <div className={`section-title-wrap customer-section-heading${centered ? ' customer-section-heading--centered' : ''}`}>
      <span className="sub-title">{eyebrow}</span>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  )
}
