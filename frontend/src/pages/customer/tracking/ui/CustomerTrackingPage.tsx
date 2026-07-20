import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CustomerEmptyState,
  CustomerFormField,
  CustomerInfoCard,
  CustomerInput,
  CustomerPageLayout,
  CustomerPrimaryButton,
  CustomerRepairStatusPanel,
  CustomerSectionHeading,
} from "../../../../shared/ui/kapa-customer";
import type { TrackingRecord } from "../../model/mock";
import { fetchTrackingRecord, TrackingApiError } from "../api/trackingApi";
import { mapTrackingRecord } from "../lib/mapTrackingRecord";

export default function CustomerTrackingPage() {
  const [plate, setPlate] = useState("51H-12345");
  const [phone, setPhone] = useState("0901234567");
  const [result, setResult] = useState<TrackingRecord | false | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");

  return (
    <CustomerPageLayout
      title="Repair Status Tracking"
      breadcrumb="Repair Status Tracking"
    >
      <section className="customer-section customer-section--tracking">
        <div className="row align-items-start g-4">
          <div className="col-lg-6">
            <CustomerSectionHeading
              eyebrow="Track Your Repair"
              title="Check repair progress fast"
              compact
            />
          </div>

          <div className="col-lg-6">
            <CustomerInfoCard
              eyebrow="Lookup"
              title="Find your order"
              className="customer-tracking-form-card"
            >
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setIsSubmitting(true);
                  setRequestError("");
                  setResult(null);

                  try {
                    const response = await fetchTrackingRecord({
                      plate: plate.trim(),
                      phone: phone.trim(),
                    });
                    setResult(mapTrackingRecord(response));
                  } catch (error) {
                    if (
                      error instanceof TrackingApiError &&
                      error.status === 404
                    ) {
                      setResult(false);
                    } else {
                      setRequestError(
                        error instanceof TrackingApiError
                          ? error.message
                          : "Unable to load tracking information right now.",
                      );
                    }
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="customer-tracking-form"
              >
                <CustomerFormField
                  id="tracking-plate"
                  label="License Plate"
                  required
                >
                  <CustomerInput
                    id="tracking-plate"
                    name="tracking-plate"
                    placeholder="License Plate*"
                    value={plate}
                    onChange={(event) => setPlate(event.target.value)}
                  />
                </CustomerFormField>

                <CustomerFormField
                  id="tracking-phone"
                  label="Phone Number"
                  required
                >
                  <CustomerInput
                    id="tracking-phone"
                    name="tracking-phone"
                    placeholder="Phone Number*"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </CustomerFormField>

                <CustomerPrimaryButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Checking Status..." : "Track Repair Status"}
                </CustomerPrimaryButton>

                {requestError ? (
                  <p className="customer-form-field__hint">{requestError}</p>
                ) : null}
              </form>
            </CustomerInfoCard>
          </div>
        </div>
      </section>

      {result === false ? (
        <section className="customer-section">
          <CustomerEmptyState
            title="No repair order found"
            description="Check plate and phone number, or contact Kapa."
            action={
              <div className="customer-empty-actions">
                <Link
                  to="/contact-us"
                  className="default-btn customer-primary-btn"
                >
                  Contact Service Team
                  <span />
                </Link>
                <Link
                  to="/my-account"
                  className="default-btn customer-primary-btn customer-primary-btn--ghost"
                >
                  Go to Login
                  <span />
                </Link>
              </div>
            }
          />
        </section>
      ) : null}

      {result ? (
        <section className="customer-section customer-section--results">
          <CustomerRepairStatusPanel result={result} />
        </section>
      ) : null}
    </CustomerPageLayout>
  );
}
