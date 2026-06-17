import { useEffect, useRef, useState } from 'react'
import type { AuthUser } from '../../../shared/auth'
import { AppointmentBookingForm } from '../../appointment-booking'

type EstimateSectionProps = {
  user?: AuthUser | null
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

export default function EstimateSection({ user }: EstimateSectionProps) {
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
        <AppointmentBookingForm user={user} />
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
