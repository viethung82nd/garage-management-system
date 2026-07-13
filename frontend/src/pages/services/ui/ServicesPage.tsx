import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CustomerEmptyState,
  CustomerInfoCard,
  CustomerPageLayout,
  CustomerPanel,
  CustomerPrimaryButton,
  CustomerSectionHeading,
} from '../../../shared/ui/kapa-customer'
import { resolveApiAssetUrl } from '../../../shared/lib/api-client'
import { fetchPublicServiceCategories, fetchPublicServices, type PublicService, type PublicServiceCategory } from '../api/servicesApi'

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}

function formatDuration(minutes?: number) {
  if (!minutes) return null
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}min` : `${hours}h`
}

const OTHER_CATEGORY = 'Other services'

export default function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') ?? ''
  const [categories, setCategories] = useState<PublicServiceCategory[]>([])
  const [services, setServices] = useState<PublicService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [categoriesResponse, servicesResponse] = await Promise.all([
          fetchPublicServiceCategories(),
          fetchPublicServices(),
        ])
        if (cancelled) return
        setCategories(categoriesResponse.filter((category) => category.isActive))
        setServices(servicesResponse.filter((service) => service.isActive))
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load the service catalog.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const groups = useMemo(() => {
    const byCategory = new Map<string, PublicService[]>()
    for (const service of services) {
      const key = service.category?.trim() || OTHER_CATEGORY
      const list = byCategory.get(key) ?? []
      list.push(service)
      byCategory.set(key, list)
    }

    const orderedNames = [...categories.map((category) => category.name), OTHER_CATEGORY].filter((name) =>
      byCategory.has(name),
    )

    return orderedNames.map((name) => ({ name, services: byCategory.get(name) ?? [] }))
  }, [categories, services])

  const visibleGroups = activeCategory ? groups.filter((group) => group.name === activeCategory) : groups

  return (
    <CustomerPageLayout title="Our Services" breadcrumb="Services">
      <section className="customer-section">
        <CustomerSectionHeading
          eyebrow="What we do"
          title="Browse our service catalog"
          description="Pick a service below, then book an appointment for it."
        />

        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 24 }}>
            <CustomerPrimaryButton className={activeCategory ? 'customer-primary-btn--ghost' : ''} onClick={() => setSearchParams({})}>
              All
            </CustomerPrimaryButton>
            {categories.map((category) => (
              <CustomerPrimaryButton
                key={category._id}
                className={activeCategory === category.name ? '' : 'customer-primary-btn--ghost'}
                onClick={() => setSearchParams({ category: category.name })}
              >
                {category.imageUrl ? (
                  <img
                    alt=""
                    src={resolveApiAssetUrl(category.imageUrl)}
                    style={{ borderRadius: '50%', height: 20, marginRight: 8, objectFit: 'cover', width: 20 }}
                  />
                ) : null}
                {category.name}
              </CustomerPrimaryButton>
            ))}
          </div>
        ) : null}

        {loading ? <CustomerPanel>Loading services...</CustomerPanel> : null}
        {error ? <CustomerPanel className="customer-panel--error">{error}</CustomerPanel> : null}

        {!loading && !error && services.length === 0 ? (
          <CustomerEmptyState
            title="No services published yet"
            description="Check back soon, or contact us directly to ask about a service."
            action={
              <Link to="/contact-us" className="default-btn customer-primary-btn">
                Contact Us
                <span />
              </Link>
            }
          />
        ) : null}

        {visibleGroups.map((group) => (
          <div key={group.name} className="customer-section">
            <CustomerSectionHeading eyebrow="Category" title={group.name} compact />
            <div className="row g-4">
              {group.services.map((service) => (
                <div className="col-lg-4 col-md-6" key={service._id}>
                  <CustomerInfoCard eyebrow={formatDuration(service.estimatedDuration) ?? 'Service'} title={service.name}>
                    <p style={{ margin: '0 0 16px' }}>{formatMoney(service.basePrice)}</p>
                    <Link to="/appointment" className="default-btn customer-primary-btn">
                      Book this service
                      <span />
                    </Link>
                  </CustomerInfoCard>
                </div>
              ))}
            </div>
          </div>
        ))}

        {!loading && services.length > 0 ? (
          <div className="customer-empty-actions">
            <Link to="/appointment" className="default-btn customer-primary-btn">
              Book an Appointment
              <span />
            </Link>
          </div>
        ) : null}
      </section>
    </CustomerPageLayout>
  )
}
