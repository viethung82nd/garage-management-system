import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297

/**
 * Renders `node` to a canvas and downloads it as an A4 PDF named `filename`,
 * split across as many pages as needed. Used for invoice/receipt "download"
 * and "print" actions where the on-screen markup already looks like a
 * printable document — those can be taller than a single A4 page.
 */
export async function exportNodeToPdf(node: HTMLElement, filename: string) {
  const canvas = await html2canvas(node, { scale: 2, useCORS: true })
  const imageWidth = A4_WIDTH_MM
  const imageHeight = (canvas.height * imageWidth) / canvas.width
  const pageCount = Math.max(1, Math.ceil(imageHeight / A4_HEIGHT_MM))

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  for (let page = 0; page < pageCount; page += 1) {
    if (page > 0) {
      pdf.addPage()
    }
    // Shift the full-height image up by one page each time so only the
    // slice for this page falls within the visible A4 bounds.
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -page * A4_HEIGHT_MM, imageWidth, imageHeight)
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
