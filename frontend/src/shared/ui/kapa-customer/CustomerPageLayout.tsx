import type { ReactNode } from 'react'
import { authPageBodyClass, usePageMeta } from '../../lib/kapa-template'
import { KapaFooter } from '../kapa-chrome/KapaFooter'
import { KapaNavbar } from '../kapa-chrome/KapaNavbar'
import { KapaPageBanner } from '../kapa-chrome/KapaPageBanner'
import { KapaTopbar } from '../kapa-chrome/KapaTopbar'

export function CustomerPageLayout({
  title,
  breadcrumb,
  children,
}: {
  title: string
  breadcrumb: string
  children: ReactNode
}) {
  usePageMeta(`${title} – Kapa`, authPageBodyClass)

  return (
    <>
      <KapaTopbar />
      <KapaNavbar activeSection="customer" logoHref="/" accountHref="/customer/profile" contactHref="/contact-us" />
      <KapaPageBanner title={title} breadcrumb={breadcrumb} />

      <div className="page-main-content customer-page-main-content">
        <div className="page-area">
          <div className="container">
            {children}
          </div>
        </div>
      </div>

      <KapaFooter />
    </>
  )
}
