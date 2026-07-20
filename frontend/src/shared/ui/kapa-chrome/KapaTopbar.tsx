import { asset } from '../../lib/asset'

export function KapaTopbar() {
  return (
    <div className="topbar-area">
      <div className="container-fluid">
        <div className="row align-items-center">
          <div className="col-lg-9 col-md-9">
            <ul className="topbar-information">
              <li>
                <img src={asset('/wp-content/uploads/2022/11/calling.svg')} alt="Icon Image" />
                <span> Call Us: </span> <a href="tel:+84848637886">+(84)848637886</a>
              </li>
              <li>
                <img src={asset('/wp-content/uploads/2022/11/map.svg')} alt="Icon Image" />
                <span> Address: </span> Thon 3, Thach Hoa, Thach That, Hanoi
              </li>
            </ul>
          </div>
          <div className="col-lg-3 col-md-3">
            <ul className="topbar-information info-right">
              <li>
                <img src={asset('/wp-content/uploads/2022/11/timer.svg')} alt="Icon Image" />
                <span> Open Hours:</span> Mon-Fri || 8 AM-6PM
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
