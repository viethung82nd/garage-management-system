/** Escapes a single CSV field per RFC 4180 (quotes fields containing commas, quotes, or newlines). */
function escapeCsvField(value: string | number) {
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/**
 * Builds a CSV file from headers + rows and triggers a browser download.
 * Used for "export the underlying data" actions where a rasterized PDF isn't
 * appropriate — the numbers stay exact and the file opens directly in Excel/
 * Sheets, unlike an html2canvas screenshot of a table.
 */
export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(','))
  // Leading BOM so Excel opens UTF-8 (e.g. "₫", Vietnamese names) correctly instead of mojibake.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
