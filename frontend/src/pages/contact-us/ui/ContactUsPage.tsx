import { useEffect, useLayoutEffect, useMemo, useState } from 'react'

const CONTACT_US_URL = '/kapa-auth/contact-us/index.html'
const CONTACT_US_BASE = '/kapa-auth/contact-us/'
const CONTACT_US_TITLE = 'Contact Us – Kapa'
const CONTACT_US_ORIGIN_BASE = `${window.location.origin}${CONTACT_US_BASE}`

type ScriptSpec = {
  src?: string
  text?: string
  type?: string
  async?: boolean
  defer?: boolean
}

type PageSpec = {
  bodyHtml: string
  bodyClassName: string
  styleHrefs: string[]
  inlineStyles: string[]
  scripts: ScriptSpec[]
}

const OVERLAY_REVEAL_SELECTOR =
  '.section-title-wrap h2, .contact-us-form .content h3, .page-banner-content h2, .partner-area .section-title-wrap h2'

function setDatasetAttributes() {
  document.body.dataset.elementorDeviceMode = 'desktop'
  document.body.dataset.aosEasing = 'ease'
  document.body.dataset.aosDuration = '400'
  document.body.dataset.aosDelay = '0'
}

function resetOverlayStyles(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('.overlay').forEach((overlay) => {
    overlay.style.removeProperty('transform')
    overlay.style.removeProperty('transform-origin')
  })
}

function parseContactUs(html: string): PageSpec {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const body = doc.body.cloneNode(true) as HTMLBodyElement
  body.querySelectorAll('.aos-animate').forEach((element) => element.classList.remove('aos-animate'))
  body.querySelectorAll('.navbar-area.is-sticky').forEach((element) => element.classList.remove('is-sticky'))
  body.querySelectorAll('.go-top.active').forEach((element) => element.classList.remove('active'))
  body.querySelectorAll('script').forEach((script) => script.remove())
  resetOverlayStyles(body)

  const styleHrefs = Array.from(doc.head.querySelectorAll('link[rel="stylesheet"]'))
    .map((link) => link.getAttribute('href'))
    .filter((href): href is string => Boolean(href))

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
    bodyClassName: doc.body.className,
    styleHrefs,
    inlineStyles,
    scripts,
  }
}

export default function ContactUsPage() {
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

    document.title = CONTACT_US_TITLE
    setDatasetAttributes()

    const base = document.createElement('base')
    base.setAttribute('href', CONTACT_US_BASE)
    base.setAttribute('data-contact-us-base', 'true')
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
      const response = await fetch(CONTACT_US_URL)
      const html = await response.text()
      if (cancelled) return
      setPageSpec(parseContactUs(html))
    })().catch((error) => {
      console.error('Failed to load contact-us clone', error)
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!pageSpec) return

    document.body.className = pageSpec.bodyClassName

    const disabledHeadLinks: HTMLLinkElement[] = []
    const linkNodes: HTMLLinkElement[] = []
    const styleNodes: HTMLStyleElement[] = []
    const scriptNodes: HTMLScriptElement[] = []

    const existingKapaLinks = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).filter(
      (link) => {
        const href = link.getAttribute('href') || ''
        return href.includes('/kapa-auth/') || href.includes('/external/')
      },
    )

    for (const link of existingKapaLinks) {
      link.disabled = true
      link.dataset.contactUsDisabled = 'true'
      disabledHeadLinks.push(link)
    }

    for (const href of pageSpec.styleHrefs) {
      const absoluteHref = new URL(href, CONTACT_US_ORIGIN_BASE).href
      const alreadyLoaded = document.head.querySelector(`link[data-contact-us-style-link="true"][href="${absoluteHref}"]`)
      if (alreadyLoaded) continue

      const linkEl = document.createElement('link')
      linkEl.rel = 'stylesheet'
      linkEl.href = absoluteHref
      linkEl.dataset.contactUsStyleLink = 'true'
      document.head.appendChild(linkEl)
      linkNodes.push(linkEl)
    }

    for (const styleText of pageSpec.inlineStyles) {
      const temp = document.createElement('div')
      temp.innerHTML = styleText.trim()
      const styleEl = temp.firstElementChild as HTMLStyleElement | null
      if (!styleEl) continue
      styleEl.dataset.contactUsStyle = 'true'
      document.head.appendChild(styleEl)
      styleNodes.push(styleEl)
    }

    let cancelled = false
    const loadScripts = async () => {
      for (const spec of pageSpec.scripts) {
        if (cancelled) return

        const scriptEl = document.createElement('script')
        scriptEl.dataset.contactUsScript = 'true'
        scriptEl.async = false
        if (spec.type) scriptEl.type = spec.type
        if (spec.defer) scriptEl.defer = true

        if (spec.src) {
          scriptEl.src = new URL(spec.src, CONTACT_US_ORIGIN_BASE).href
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

      const win = window as Window & {
        ScrollMagic?: {
          Controller?: new () => { destroy?: (resetScenes?: boolean) => void }
          Scene?: new (options: { triggerElement: Element; triggerHook: number }) => {
            setTween: (tween: unknown) => { addTo: (controller: unknown) => void }
          }
        }
        TimelineMax?: new () => {
          from: (target: Element, duration: number, vars: Record<string, unknown>) => void
          to: (target: Element, duration: number, vars: Record<string, unknown>, position?: string) => void
        }
      }

      const Controller = win.ScrollMagic?.Controller
      const Scene = win.ScrollMagic?.Scene
      const TimelineMax = win.TimelineMax

      if (!Controller || !Scene || !TimelineMax) return undefined

      resetOverlayStyles(document)
      const controller = new Controller()

      document.querySelectorAll(OVERLAY_REVEAL_SELECTOR).forEach((title) => {
        const overlay = title.querySelector('.overlay')
        if (!overlay) return

        const timeline = new TimelineMax()
        timeline.from(overlay, 0.5, { scaleX: 0, transformOrigin: 'left' })
        timeline.to(overlay, 0.5, { scaleX: 0, transformOrigin: 'right' }, 'reveal')

        new Scene({
          triggerElement: title,
          triggerHook: 0.7,
        })
          .setTween(timeline)
          .addTo(controller)
      })

      return controller
    }

    let overlayController: { destroy?: (resetScenes?: boolean) => void } | undefined

    void loadScripts().then(() => {
      if (!cancelled) overlayController = initAnimations()
    })

    return () => {
      cancelled = true
      overlayController?.destroy?.(true)
      for (const node of linkNodes) node.remove()
      for (const node of scriptNodes) node.remove()
      for (const node of styleNodes) node.remove()
      for (const link of disabledHeadLinks) {
        link.disabled = false
        delete link.dataset.contactUsDisabled
      }
    }
  }, [pageSpec])

  const markup = useMemo(() => pageSpec?.bodyHtml || '', [pageSpec])

  return <div className="contact-us-root" dangerouslySetInnerHTML={{ __html: markup }} aria-busy={!pageSpec} />
}
