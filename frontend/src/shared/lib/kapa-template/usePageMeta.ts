import { useEffect } from 'react'

export const authPageBodyClass =
  'wp-singular page-template-default page page-id-808 wp-theme-kapa theme-kapa woocommerce-account woocommerce-page woocommerce-js elementor-default elementor-kit-5'

export function usePageMeta(title: string, bodyClass = authPageBodyClass) {
  useEffect(() => {
    document.title = title
    const previous = document.body.className
    document.body.className = bodyClass
    return () => {
      document.body.className = previous
    }
  }, [bodyClass, title])
}
