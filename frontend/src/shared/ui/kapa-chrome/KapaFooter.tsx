import { Link } from 'react-router-dom'
import { asset } from '../../lib/asset'

export function KapaFooter() {
  return (
    <div className="footer-area pt-100">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-4 col-sm-6">
            <div className="widget single-footer-widget widget_kapa_contact_info">
              <h3 className="widget_title">Contact Information </h3>
              <ul className="info-list">
                <li>
                  <img src={asset('/wp-content/uploads/2022/11/calling.svg')} alt="Image" />
                  <span>Call Us: </span> <a href="tel:+84848637886">+(84)848637886</a>
                </li>
                <li>
                  <img src={asset('/wp-content/uploads/2022/11/timer.svg')} alt="Image" />
                  <span>Address: </span> Thon 3, Thach Hoa, Thach That, Hanoi
                </li>
                <li>
                  <img src={asset('/wp-content/uploads/2022/11/map.svg')} alt="Image" />
                  <span>Email: </span> hellokapa@gmail.com
                </li>
              </ul>
            </div>
          </div>

          <div className="col-lg-4 col-sm-6">
            <div className="widget single-footer-widget">
              <a className="footer-logo" href="#">
                <img src={asset('/wp-content/uploads/2023/01/Kapa_Logo-1.svg')} alt="Kapa" />
              </a>
              <ul className="social-link">
                <li>
                  <a href="#">Facebook</a>
                </li>
                <li>
                  <a href="#">Twitter</a>
                </li>
                <li>
                  <a href="#">Linkedin</a>
                </li>
                <li>
                  <a href="#">Instagram</a>
                </li>
                <li>
                  <a href="#">Youtube</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="col-lg-4 col-sm-6">
            <div className="widget single-footer-widget widget_kapa_contact_info">
              <h3 className="widget_title">Business Hours </h3>
              <ul className="info-list">
                <li>
                  <span>Mon - Fri: </span> 8:00 AM - 6:00 PM
                </li>
                <li>
                  <span>Sat: </span> 8:30 AM - 2:00 PM
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="copyright-area">
          <div className="row align-items-center">
            <div className="col-lg-12">
              <div className="copyright-wrap">
                <ul className="footer-menu">
                  <li>
                    <a href="#">About Us</a>
                  </li>
                  <li>
                    <a href="#">Our Team</a>
                  </li>
                  <li>
                    <Link to="/contact-us">Contact Us</Link>
                  </li>
                </ul>
                <div className="copyright-text">
                  <p>
                    © Kapa All Rights Reserved by <a href="#">EnvyTheme</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
