import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'

const HOME_FIVE_URL = '/kapa-auth/home-five/index.html'
const HOME_FIVE_BASE = '/kapa-auth/home-five/'
const HOME_FIVE_TITLE = 'Home Five – Kapa'
const HOME_FIVE_ORIGIN_BASE = `${window.location.origin}${HOME_FIVE_BASE}`
const HOME_FIVE_BODY_CLASS =
  'wp-singular page-template-default page page-id-988 wp-theme-kapa theme-kapa woocommerce-js elementor-default elementor-kit-5 elementor-page elementor-page-988 e--ua-blink e--ua-chrome e--ua-webkit'

type ScriptSpec = {
  src?: string
  text?: string
  type?: string
  async?: boolean
  defer?: boolean
}

type PageSpec = {
  bodyHtml: string
  inlineStyles: string[]
  scripts: ScriptSpec[]
}

type EstimateFormState = {
  name: string
  email: string
  number: string
  service: string
  message: string
}

function setDatasetAttributes() {
  document.body.dataset.elementorDeviceMode = 'desktop'
  document.body.dataset.aosEasing = 'ease'
  document.body.dataset.aosDuration = '400'
  document.body.dataset.aosDelay = '0'
}

function parseHomeFive(html: string): PageSpec {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const body = doc.body.cloneNode(true) as HTMLBodyElement
  body.querySelectorAll('.aos-animate').forEach((element) => element.classList.remove('aos-animate'))
  body.querySelectorAll('script').forEach((script) => script.remove())
  body.querySelectorAll('.estimate-left-content').forEach((element) => {
    const slot = doc.createElement('div')
    slot.id = 'home-five-estimate-slot'
    slot.setAttribute('data-home-five-estimate-slot', 'true')
    element.replaceWith(slot)
  })

  const inlineStyles = Array.from(doc.head.querySelectorAll('style')).map((style) => style.outerHTML)

  const scripts = Array.from(doc.querySelectorAll('script'))
    .map((script) => ({
      src: script.getAttribute('src') || undefined,
      text: script.textContent || undefined,
      type: script.getAttribute('type') || undefined,
      async: script.hasAttribute('async'),
      defer: script.hasAttribute('defer'),
    }))
    .filter((script) => script.src || script.text?.trim())

  return {
    bodyHtml: body.innerHTML,
    inlineStyles,
    scripts,
  }
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

function EstimateSection() {
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

export default function HomeFivePage() {
  const [pageSpec, setPageSpec] = useState<PageSpec | null>(null)

  useLayoutEffect(() => {
    const previousTitle = document.title
    const previousClassName = document.body.className
    const previousDataset = {
      elementorDeviceMode: document.body.dataset.elementorDeviceMode,
      aosEasing: document.body.dataset.aosEasing,
      aosDuration: document.body.dataset.aosDuration,
      aosDelay: document.body.dataset.aosDelay,
    }

    document.title = HOME_FIVE_TITLE
    document.body.className = HOME_FIVE_BODY_CLASS
    setDatasetAttributes()

    const base = document.createElement('base')
    base.setAttribute('href', HOME_FIVE_BASE)
    base.setAttribute('data-home-five-base', 'true')
    document.head.appendChild(base)

    return () => {
      document.title = previousTitle
      document.body.className = previousClassName

      if (previousDataset.elementorDeviceMode) document.body.dataset.elementorDeviceMode = previousDataset.elementorDeviceMode
      else delete document.body.dataset.elementorDeviceMode
      if (previousDataset.aosEasing) document.body.dataset.aosEasing = previousDataset.aosEasing
      else delete document.body.dataset.aosEasing
      if (previousDataset.aosDuration) document.body.dataset.aosDuration = previousDataset.aosDuration
      else delete document.body.dataset.aosDuration
      if (previousDataset.aosDelay) document.body.dataset.aosDelay = previousDataset.aosDelay
      else delete document.body.dataset.aosDelay

      base.remove()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const response = await fetch(HOME_FIVE_URL)
      const html = await response.text()
      if (cancelled) return
      setPageSpec(parseHomeFive(html))
    })().catch((error) => {
      console.error('Failed to load home-five clone', error)
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!pageSpec) return

    const styleNodes: HTMLStyleElement[] = []
    const scriptNodes: HTMLScriptElement[] = []

    for (const styleText of pageSpec.inlineStyles) {
      const temp = document.createElement('div')
      temp.innerHTML = styleText.trim()
      const styleEl = temp.firstElementChild as HTMLStyleElement | null
      if (!styleEl) continue
      styleEl.dataset.homeFiveStyle = 'true'
      document.head.appendChild(styleEl)
      styleNodes.push(styleEl)
    }

    let cancelled = false
    const loadScripts = async () => {
      for (const spec of pageSpec.scripts) {
        if (cancelled) return

        const scriptEl = document.createElement('script')
        scriptEl.dataset.homeFiveScript = 'true'
        scriptEl.async = false
        if (spec.type) scriptEl.type = spec.type
        if (spec.defer) scriptEl.defer = true
        if (spec.src) {
          scriptEl.src = new URL(spec.src, HOME_FIVE_ORIGIN_BASE).href
          await new Promise<void>((resolve) => {
            scriptEl.onload = () => resolve()
            scriptEl.onerror = () => resolve()
            document.head.appendChild(scriptEl)
            scriptNodes.push(scriptEl)
          })
          continue
        }

        if (spec.text) scriptEl.textContent = spec.text
        document.head.appendChild(scriptEl)
        scriptNodes.push(scriptEl)
      }
    }

    const initAnimations = () => {
      const aos = (window as Window & {
        AOS?: { init?: (options?: Record<string, unknown>) => void; refreshHard?: () => void }
      }).AOS
      aos?.init?.({ once: true, duration: 800, easing: 'ease' })
      aos?.refreshHard?.()
    }

    void loadScripts().then(() => {
      if (!cancelled) initAnimations()
    })

    return () => {
      cancelled = true
      for (const node of scriptNodes) node.remove()
      for (const node of styleNodes) node.remove()
    }
  }, [pageSpec])

  const markup = useMemo(() => pageSpec?.bodyHtml || '', [pageSpec])

  useLayoutEffect(() => {
    if (!pageSpec) return

    const slot = document.getElementById('home-five-estimate-slot')
    if (!slot) return

    const root = createRoot(slot)
    root.render(<EstimateSection />)

    return () => {
      root.unmount()
    }
  }, [markup, pageSpec])

  return (
    <div className="home-five-root" dangerouslySetInnerHTML={{ __html: markup }} aria-busy={!pageSpec} />
  )
}
