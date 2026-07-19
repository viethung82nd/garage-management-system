export type KapaScriptSpec = {
  src?: string
  text?: string
  type?: string
  async?: boolean
  defer?: boolean
}

export type ParsedTemplatePage = {
  bodyHtml: string
  bodyClassName: string
  styleHrefs: string[]
  inlineStyles: string[]
  scripts: KapaScriptSpec[]
}

export type TransformTemplateDocument = (doc: Document, body: HTMLBodyElement) => void

function resetOverlayStyles(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('.overlay').forEach((overlay) => {
    overlay.style.removeProperty('transform')
    overlay.style.removeProperty('transform-origin')
  })
}

// The static HTML export was snapshotted after Owl Carousel had already run, so it bakes in
// owl-loaded/owl-drag state, inline owl-stage transforms/widths, and cloned .owl-item duplicates
// for the infinite-loop effect. Re-running owl.carousel.min.js on top of that stale state treats
// the clones as real slides and re-clones them, compounding stage width/height on every carousel
// on the page. Strip it back to the pre-init shape (carousel wrapping only its real slide content)
// so the script initializes cleanly, same as we do for AOS/sticky/go-top state above.
function stripOwlCarouselState(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('.owl-carousel').forEach((carousel) => {
    const stage = carousel.querySelector('.owl-stage')
    if (!stage) return

    const realSlides = Array.from(stage.children)
      .filter((item) => !item.classList.contains('cloned'))
      .map((item) => item.firstElementChild)
      .filter((slide): slide is Element => Boolean(slide))

    carousel.querySelector('.owl-stage-outer')?.remove()
    carousel.querySelector('.owl-nav')?.remove()
    carousel.querySelector('.owl-dots')?.remove()

    for (const slide of realSlides) carousel.appendChild(slide)

    carousel.classList.remove('owl-loaded', 'owl-drag', 'owl-hidden', 'owl-text-select-on', 'owl-grab')
  })
}

export function parseTemplatePage(html: string, transformDocument?: TransformTemplateDocument): ParsedTemplatePage {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const body = doc.body.cloneNode(true) as HTMLBodyElement
  body.querySelectorAll('.aos-animate').forEach((element) => element.classList.remove('aos-animate'))
  body.querySelectorAll('.navbar-area.is-sticky').forEach((element) => element.classList.remove('is-sticky'))
  body.querySelectorAll('.go-top.active').forEach((element) => element.classList.remove('active'))
  body.querySelectorAll('script').forEach((script) => script.remove())
  resetOverlayStyles(body)
  stripOwlCarouselState(body)

  transformDocument?.(doc, body)

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
