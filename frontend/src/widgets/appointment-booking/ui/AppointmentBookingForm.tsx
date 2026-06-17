import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { AuthUser } from '../../../shared/auth'
import {
  AppointmentApiError,
  createAppointmentBooking,
  fetchAppointmentServices,
  fetchAppointmentSlots,
  type AppointmentService,
  type AppointmentSlot,
} from '../api/appointmentApi'

type AppointmentBookingFormProps = {
  user?: AuthUser | null
}

type AppointmentFormState = {
  fullName: string
  email: string
  phone: string
  licensePlate: string
  bookingDate: string
  timeSlot: string
  serviceId: string
  note: string
}

type SubmitState =
  | { type: 'idle'; message: string }
  | { type: 'loading'; message: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }

function getTodayInputValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildInitialState(fullName = '', email = '', phone = ''): AppointmentFormState {
  return {
    fullName,
    email,
    phone,
    licensePlate: '',
    bookingDate: '',
    timeSlot: '',
    serviceId: '',
    note: '',
  }
}

function formatSlotLabel(slot: AppointmentSlot) {
  if (!slot.available) {
    return `${slot.timeSlot} · Full`
  }

  const remaining = Math.max(slot.capacity - slot.booked, 0)
  return `${slot.timeSlot} · ${remaining} spot${remaining === 1 ? '' : 's'} left`
}

function formatSubmitMessage(bookingId: string, bookingDate: string, timeSlot: string) {
  return `Appointment request ${bookingId.slice(-6).toUpperCase()} was sent for ${bookingDate} at ${timeSlot}.`
}

export default function AppointmentBookingForm({ user }: AppointmentBookingFormProps) {
  const [formState, setFormState] = useState<AppointmentFormState>(() =>
    buildInitialState(user?.fullName || '', user?.email || '', user?.phone || ''),
  )
  const [services, setServices] = useState<AppointmentService[]>([])
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(true)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>({ type: 'idle', message: '' })
  const minimumDate = useMemo(() => getTodayInputValue(), [])

  useEffect(() => {
    setFormState((current) => ({
      ...current,
      fullName: user?.fullName || current.fullName,
      email: user?.email || current.email,
      phone: user?.phone || current.phone,
    }))
  }, [user])

  useEffect(() => {
    let cancelled = false

    setIsLoadingServices(true)
    fetchAppointmentServices()
      .then((response) => {
        if (cancelled) return
        setServices(response)
      })
      .catch((error) => {
        if (cancelled) return
        const message =
          error instanceof AppointmentApiError ? error.message : 'Unable to load services right now.'
        setSubmitState({ type: 'error', message })
      })
      .finally(() => {
        if (!cancelled) setIsLoadingServices(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!formState.bookingDate) {
      setSlots([])
      setFormState((current) => ({ ...current, timeSlot: '' }))
      return
    }

    let cancelled = false
    setIsLoadingSlots(true)
    setFormState((current) => ({ ...current, timeSlot: '' }))

    fetchAppointmentSlots(formState.bookingDate)
      .then((response) => {
        if (cancelled) return
        setSlots(response)
      })
      .catch((error) => {
        if (cancelled) return
        setSlots([])
        const message =
          error instanceof AppointmentApiError ? error.message : 'Unable to load time slots right now.'
        setSubmitState({ type: 'error', message })
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSlots(false)
      })

    return () => {
      cancelled = true
    }
  }, [formState.bookingDate])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitState({ type: 'loading', message: 'Sending your appointment request...' })

    try {
      const response = await createAppointmentBooking({
        customer: {
          fullName: formState.fullName.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim(),
        },
        vehicle: {
          licensePlate: formState.licensePlate.trim().toUpperCase(),
        },
        serviceId: formState.serviceId,
        bookingDate: formState.bookingDate,
        timeSlot: formState.timeSlot,
        note: formState.note.trim(),
      })

      setSubmitState({
        type: 'success',
        message: formatSubmitMessage(
          response.booking._id,
          formState.bookingDate,
          formState.timeSlot,
        ),
      })
      setSlots([])
      setFormState(buildInitialState(user?.fullName || '', user?.email || '', user?.phone || ''))
    } catch (error) {
      setSubmitState({
        type: 'error',
        message:
          error instanceof AppointmentApiError
            ? error.message
            : 'Unable to create the appointment right now.',
      })
    }
  }

  return (
    <div className="wpcf7 js appointment-booking-panel" lang="en-US" dir="ltr" data-wpcf7-id="86">
      <div className="screen-reader-response">
        <p role="status" aria-live="polite" aria-atomic="true" />
        <ul />
      </div>
      <form className="wpcf7-form init appointment-booking-form" onSubmit={handleSubmit} aria-label="Appointment form">
        <div className="row">
          <div className="col-lg-6 col-md-6">
            <div className="form-group">
              <span className="wpcf7-form-control-wrap" data-name="your-name">
                <input
                  className="wpcf7-form-control wpcf7-text wpcf7-validates-as-required form-control"
                  placeholder="Name*"
                  type="text"
                  required
                  value={formState.fullName}
                  onChange={(event) => setFormState((current) => ({ ...current, fullName: event.target.value }))}
                />
              </span>
            </div>
          </div>

          <div className="col-lg-6 col-md-6">
            <div className="form-group">
              <span className="wpcf7-form-control-wrap" data-name="your-email">
                <input
                  className="wpcf7-form-control wpcf7-email wpcf7-validates-as-required wpcf7-text wpcf7-validates-as-email form-control"
                  placeholder="Email*"
                  type="email"
                  required
                  value={formState.email}
                  onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                />
              </span>
            </div>
          </div>

          <div className="col-lg-6 col-md-6">
            <div className="form-group">
              <span className="wpcf7-form-control-wrap" data-name="your-number">
                <input
                  className="wpcf7-form-control wpcf7-number wpcf7-validates-as-required wpcf7-validates-as-number form-control"
                  placeholder="Number*"
                  type="tel"
                  required
                  value={formState.phone}
                  onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
                />
              </span>
            </div>
          </div>

          <div className="col-lg-6 col-md-6">
            <div className="form-group">
              <span className="wpcf7-form-control-wrap" data-name="license-plate">
                <input
                  className="wpcf7-form-control wpcf7-text wpcf7-validates-as-required form-control"
                  placeholder="License Plate*"
                  type="text"
                  required
                  value={formState.licensePlate}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      licensePlate: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </span>
            </div>
          </div>

          <div className="col-lg-6 col-md-6">
            <div className="form-group">
              <span className="wpcf7-form-control-wrap" data-name="booking-date">
                <input
                  className="wpcf7-form-control wpcf7-text wpcf7-validates-as-required form-control"
                  type="date"
                  min={minimumDate}
                  required
                  value={formState.bookingDate}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, bookingDate: event.target.value }))
                  }
                />
              </span>
            </div>
          </div>

          <div className="col-lg-6 col-md-6">
            <div className="form-group">
              <div className="select-box">
                <span className="wpcf7-form-control-wrap" data-name="time-slot">
                  <select
                    className="wpcf7-form-control wpcf7-select wpcf7-validates-as-required form-control"
                    required
                    value={formState.timeSlot}
                    disabled={!formState.bookingDate || isLoadingSlots}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, timeSlot: event.target.value }))
                    }
                  >
                    <option value="">
                      {!formState.bookingDate
                        ? '-- Select Date First --'
                        : isLoadingSlots
                          ? '-- Loading Slots --'
                          : '-- Select Time Slot --'}
                    </option>
                    {slots.map((slot) => (
                      <option key={slot.timeSlot} value={slot.timeSlot} disabled={!slot.available}>
                        {formatSlotLabel(slot)}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
            </div>
          </div>

          <div className="col-lg-12 col-md-12">
            <div className="form-group">
              <div className="select-box">
                <span className="wpcf7-form-control-wrap" data-name="ourservices">
                  <select
                    className="wpcf7-form-control wpcf7-select wpcf7-validates-as-required form-control"
                    required
                    value={formState.serviceId}
                    disabled={isLoadingServices}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, serviceId: event.target.value }))
                    }
                  >
                    <option value="">{isLoadingServices ? '-- Loading Services --' : '-- Select Services --'}</option>
                    {services.map((service) => (
                      <option key={service._id} value={service._id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
            </div>
          </div>

          <div className="col-lg-12 col-md-12">
            <div className="form-group">
              <span className="wpcf7-form-control-wrap" data-name="your-message">
                <textarea
                  className="wpcf7-form-control wpcf7-textarea form-control"
                  placeholder="Your Message"
                  rows={5}
                  value={formState.note}
                  onChange={(event) => setFormState((current) => ({ ...current, note: event.target.value }))}
                />
              </span>
            </div>
          </div>

          <div className="col-lg-12 col-md-12">
            <button
              type="submit"
              className="default-btn"
              disabled={submitState.type === 'loading' || isLoadingServices}
            >
              {submitState.type === 'loading' ? 'Sending Request...' : 'Make An Appointment'}
            </button>
          </div>
        </div>

        <div
          className={`wpcf7-response-output appointment-booking-feedback appointment-booking-feedback--${submitState.type}`}
          aria-live="polite"
        >
          {submitState.message}
        </div>
      </form>
    </div>
  )
}
