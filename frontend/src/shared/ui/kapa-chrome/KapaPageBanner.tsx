import { asset } from '../../lib/asset'

export function KapaPageBanner({
  title,
  breadcrumb,
}: {
  title: string
  breadcrumb: string
}) {
  return (
    <div className="page-banner-area" style={{ backgroundImage: `url(${asset('/wp-content/uploads/2022/11/banner-bg-2.webp')})` }}>
      <div className="container-fluid">
        <div className="page-banner-content">
          <ul>
            <li>
              <a href="#">Home</a>
            </li>
            <li>
              <span>{breadcrumb}</span>
            </li>
          </ul>
          <h2>{title}</h2>
        </div>
      </div>
    </div>
  )
}
