import { useEffect, useRef, useState, type FormEvent } from 'react'

type EstimateFormState = {
  name: string
  email: string
  number: string
  service: string
  message: string
}

function useAnimatedCount(target: number, active: boolean) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) {
      setValue(0)
      return
    }

    let frame = 0
    let startTime: number | null = null

    const tick = (time: number) => {
      if (startTime === null) startTime = time
      const progress = Math.min((time - startTime) / 1200, 1)
      setValue(Math.round(target * progress))
      if (progress < 1) frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [active, target])

  return value
}

export default function EstimateSection() {
  const [formState, setFormState] = useState<EstimateFormState>({
    name: '',
    email: '',
    number: '',
    service: '',
    message: '',
  })
  const [isVisible, setIsVisible] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const element = rootRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.18 },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const awards = useAnimatedCount(45, isVisible)
  const projects = useAnimatedCount(350, isVisible)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    window.alert(
      `Estimate request submitted for ${formState.name || 'guest'}.\nWe will contact ${formState.email || 'you'} soon.`,
    )
  }

  return (
    <div
      ref={rootRef}
      className="estimate-left-content aos-init aos-animate home-five-estimate-panel"
      data-aos="fade-right"
      data-aos-delay="80"
      data-aos-duration="800"
      data-aos-once="true"
    >
      <b>Get Estimate</b>
      <h3>Get A Location-Based Car Repair Estimate</h3>

      <div className="estimate-form">
        <form className="wpcf7-form init home-five-estimate-form" onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-lg-6 col-md-6">
              <div className="form-group">
                <input
                  className="wpcf7-form-control wpcf7-text wpcf7-validates-as-required form-control"
                  placeholder="Name*"
                  type="text"
                  name="your-name"
                  value={formState.name}
                  onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
            </div>

            <div className="col-lg-6 col-md-6">
              <div className="form-group">
                <input
                  className="wpcf7-form-control wpcf7-email wpcf7-validates-as-required wpcf7-text wpcf7-validates-as-email form-control"
                  placeholder="Email*"
                  type="email"
                  name="your-email"
                  value={formState.email}
                  onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
            </div>

            <div className="col-lg-6 col-md-6">
              <div className="form-group">
                <input
                  className="wpcf7-form-control wpcf7-number wpcf7-validates-as-required wpcf7-validates-as-number form-control"
                  placeholder="Number*"
                  type="number"
                  name="your-number"
                  value={formState.number}
                  onChange={(event) => setFormState((current) => ({ ...current, number: event.target.value }))}
                />
              </div>
            </div>

            <div className="col-lg-6 col-md-6">
              <div className="form-group">
                <div className="select-box">
                  <select
                    className="wpcf7-form-control wpcf7-select wpcf7-validates-as-required form-control home-five-select"
                    id="ourservices"
                    name="ourservices"
                    value={formState.service}
                    onChange={(event) => setFormState((current) => ({ ...current, service: event.target.value }))}
                  >
                    <option value="">-- Select Services --</option>
                    <option value="Belts And Hoses">Belts And Hoses</option>
                    <option value="Brake Repair">Brake Repair</option>
                    <option value="Suspension Repair">Suspension Repair</option>
                    <option value="Liquid Changing">Liquid Changing</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="col-lg-12 col-md-12">
              <div className="form-group">
                <textarea
                  className="wpcf7-form-control wpcf7-textarea form-control"
                  placeholder="Your Message"
                  name="your-message"
                  rows={5}
                  value={formState.message}
                  onChange={(event) => setFormState((current) => ({ ...current, message: event.target.value }))}
                />
              </div>
            </div>

            <div className="col-lg-12 col-md-12">
              <button type="submit" className="default-btn">
                Make An Appointment
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="row four-about-funfact">
        <div className="col-lg-6 col-sm-6 col-6">
          <div className="funfact-card aos-init aos-animate" data-aos="fade-up" data-aos-delay="80" data-aos-duration="800" data-aos-once="true">
            <h3>
              <span className="odometer odometer-auto-theme" data-count="45">
                {awards}
              </span>
              <span className="small-text">+</span>
            </h3>
            <p className="left">Awards Winning</p>
          </div>
        </div>
        <div className="col-lg-6 col-sm-6 col-6">
          <div className="funfact-card aos-init aos-animate" data-aos="fade-up" data-aos-delay="80" data-aos-duration="800" data-aos-once="true">
            <h3>
              <span className="odometer odometer-auto-theme" data-count="350">
                {projects}
              </span>
              <span className="small-text">+</span>
            </h3>
            <p className="left">Total Projects</p>
          </div>
        </div>
      </div>
    </div>
  )
}
