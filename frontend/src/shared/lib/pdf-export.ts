import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297

/**
 * Renders `node` to a canvas and downloads it as a single-page A4 PDF named
 * `filename`. Used for invoice/receipt "download" and "print" actions where
 * the on-screen markup already looks like a printable document.
 */
export async function exportNodeToPdf(node: HTMLElement, filename: string) {
  const canvas = await html2canvas(node, { scale: 2, useCORS: true })
  const imageData = canvas.toDataURL('image/png')

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const imageWidth = A4_WIDTH_MM
  const imageHeight = (canvas.height * imageWidth) / canvas.width

  pdf.addImage(imageData, 'PNG', 0, 0, imageWidth, Math.min(imageHeight, A4_HEIGHT_MM))
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
