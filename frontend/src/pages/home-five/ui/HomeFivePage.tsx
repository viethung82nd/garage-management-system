import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import EstimateSection from '../../../widgets/home-five-estimate/ui/EstimateSection'

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

  useEffect(() => {
    if (!pageSpec) return

    const slot = document.getElementById('home-five-estimate-slot')
    if (!slot) return

    const root = createRoot(slot)
    root.render(<EstimateSection />)

    return () => {
      root.unmount()
    }
  }, [markup, pageSpec])

  return <div className="home-five-root" dangerouslySetInnerHTML={{ __html: markup }} aria-busy={!pageSpec} />
}
