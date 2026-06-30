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

export function parseTemplatePage(html: string, transformDocument?: TransformTemplateDocument): ParsedTemplatePage {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const body = doc.body.cloneNode(true) as HTMLBodyElement
  body.querySelectorAll('.aos-animate').forEach((element) => element.classList.remove('aos-animate'))
  body.querySelectorAll('.navbar-area.is-sticky').forEach((element) => element.classList.remove('is-sticky'))
  body.querySelectorAll('.go-top.active').forEach((element) => element.classList.remove('active'))
  body.querySelectorAll('script').forEach((script) => script.remove())
  resetOverlayStyles(body)

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
