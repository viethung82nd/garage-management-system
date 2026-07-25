import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { parseTemplatePage, type ParsedTemplatePage, type TransformTemplateDocument } from './parseTemplatePage'

type KapaAnimationController = { destroy?: (resetScenes?: boolean) => void }

export type UseClonedKapaPageConfig = {
  htmlUrl: string
  baseHref: string
  documentTitle: string
  defaultBodyClassName?: string
  overlaySelector?: string
  transformDocument?: TransformTemplateDocument
  disableExistingLink?: (href: string) => boolean
}

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

function defaultDisableExistingLink(href: string) {
  return href.includes('/kapa-auth/')
}

export function useClonedKapaPage({
  htmlUrl,
  baseHref,
  documentTitle,
  defaultBodyClassName,
  overlaySelector,
  transformDocument,
  disableExistingLink = defaultDisableExistingLink,
}: UseClonedKapaPageConfig) {
  const [pageSpec, setPageSpec] = useState<ParsedTemplatePage | null>(null)
  const originBase = useMemo(() => `${window.location.origin}${baseHref}`, [baseHref])

  useLayoutEffect(() => {
    const previousTitle = document.title
    const previousClassName = document.body.className
    const previousDataset = {
      elementorDeviceMode: document.body.dataset.elementorDeviceMode,
      aosEasing: document.body.dataset.aosEasing,
      aosDuration: document.body.dataset.aosDuration,
      aosDelay: document.body.dataset.aosDelay,
    }

    document.title = documentTitle
    setDatasetAttributes()

    const base = document.createElement('base')
    base.setAttribute('href', baseHref)
    base.setAttribute('data-kapa-template-base', 'true')
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
  }, [baseHref, documentTitle])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const response = await fetch(htmlUrl)
      const html = await response.text()
      if (cancelled) return
      setPageSpec(parseTemplatePage(html, transformDocument))
    })().catch((error) => {
      console.error(`Failed to load cloned Kapa page from ${htmlUrl}`, error)
    })

    return () => {
      cancelled = true
    }
  }, [htmlUrl, transformDocument])

  useEffect(() => {
    if (!pageSpec) return

    document.body.className = pageSpec.bodyClassName || defaultBodyClassName || document.body.className

    const disabledHeadLinks: HTMLLinkElement[] = []
    const linkNodes: HTMLLinkElement[] = []
    const styleNodes: HTMLStyleElement[] = []
    const scriptNodes: HTMLScriptElement[] = []

    const existingKapaLinks = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).filter((link) => {
      const href = link.getAttribute('href') || ''
      return disableExistingLink(href)
    })

    for (const link of existingKapaLinks) {
      link.disabled = true
      link.dataset.kapaTemplateDisabled = 'true'
      disabledHeadLinks.push(link)
    }

    for (const href of pageSpec.styleHrefs) {
      const absoluteHref = new URL(href, originBase).href
      const alreadyLoaded = document.head.querySelector(`link[data-kapa-template-style-link="true"][href="${absoluteHref}"]`)
      if (alreadyLoaded) continue

      const linkEl = document.createElement('link')
      linkEl.rel = 'stylesheet'
      linkEl.href = absoluteHref
      linkEl.dataset.kapaTemplateStyleLink = 'true'
      document.head.appendChild(linkEl)
      linkNodes.push(linkEl)
    }

    for (const styleText of pageSpec.inlineStyles) {
      const temp = document.createElement('div')
      temp.innerHTML = styleText.trim()
      const styleEl = temp.firstElementChild as HTMLStyleElement | null
      if (!styleEl) continue
      styleEl.dataset.kapaTemplateStyle = 'true'
      document.head.appendChild(styleEl)
      styleNodes.push(styleEl)
    }

    let cancelled = false

    // Every cloned Kapa page ships ~40 external scripts (jQuery, its
    // plugins, GSAP/ScrollMagic, etc.) interleaved with inline ones (theme
    // init snippets that assume jQuery/wp already exist as globals).
    // `async = false` on a dynamically-inserted <script src> genuinely does
    // guarantee execution order *relative to other async=false scripts* —
    // but an inline script (no src) has no fetch step, so it runs
    // synchronously the instant it's appended, without waiting for any
    // still-downloading external script ahead of it. Appending everything
    // in one synchronous loop (the previous approach here) let inline
    // scripts jump the queue, intermittently throwing "jQuery is not
    // defined" depending on how fast jquery.js happened to download —
    // exactly the "works sometimes" bug this caused.
    //
    // Fix: preload every external script's bytes in parallel up front (pure
    // network fetch, no execution — keeps the original perf win of not
    // serializing the waterfall), but only ever *append* one script element
    // at a time, awaiting each external one's onload before appending the
    // next. That restores real document-order execution semantics — by the
    // time each <script src> tag actually gets appended, the browser has
    // usually already fetched it via the preload hint, so the wait is
    // near-instant instead of a fresh round trip.
    const loadScripts = () => {
      const preloadLinks: HTMLLinkElement[] = []
      for (const spec of pageSpec.scripts) {
        if (!spec.src) continue
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'script'
        link.href = new URL(spec.src, originBase).href
        link.dataset.kapaTemplatePreload = 'true'
        document.head.appendChild(link)
        preloadLinks.push(link)
      }

      const appendInOrder = pageSpec.scripts.reduce<Promise<void>>(
        (chain, spec) =>
          chain.then(
            () =>
              new Promise<void>((resolve) => {
                const scriptEl = document.createElement('script')
                scriptEl.dataset.kapaTemplateScript = 'true'
                if (spec.type) scriptEl.type = spec.type
                if (spec.defer) scriptEl.defer = true

                if (spec.src) {
                  scriptEl.src = new URL(spec.src, originBase).href
                  scriptEl.onload = () => resolve()
                  scriptEl.onerror = () => resolve()
                  document.head.appendChild(scriptEl)
                  scriptNodes.push(scriptEl)
                } else {
                  if (spec.text) scriptEl.textContent = spec.text
                  document.head.appendChild(scriptEl)
                  scriptNodes.push(scriptEl)
                  resolve()
                }
              }),
          ),
        Promise.resolve(),
      )

      return appendInOrder.then(() => {
        for (const link of preloadLinks) link.remove()
      })
    }

    const initAnimations = () => {
      const aos = (window as Window & {
        AOS?: { init?: (options?: Record<string, unknown>) => void; refreshHard?: () => void }
      }).AOS
      aos?.init?.({ once: true, duration: 800, easing: 'ease' })
      aos?.refreshHard?.()

      if (!overlaySelector) return undefined

      const win = window as Window & {
        ScrollMagic?: {
          Controller?: new () => KapaAnimationController
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

      document.querySelectorAll(overlaySelector).forEach((title) => {
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

    let overlayController: KapaAnimationController | undefined

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
        delete link.dataset.kapaTemplateDisabled
      }
    }
  }, [defaultBodyClassName, disableExistingLink, originBase, overlaySelector, pageSpec])

  const markup = useMemo(() => pageSpec?.bodyHtml || '', [pageSpec])

  return {
    markup,
    pageSpec,
    isReady: Boolean(pageSpec),
  }
}
