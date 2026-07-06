type CustomerRatingInputProps = {
  value: number
  onChange: (rating: number) => void
  disabled?: boolean
}

const RATING_VALUES = [1, 2, 3, 4, 5]

export function CustomerRatingInput({ value, onChange, disabled = false }: CustomerRatingInputProps) {
  return (
    <div className="customer-rating-input" role="radiogroup" aria-label="Rating">
      {RATING_VALUES.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          disabled={disabled}
          onClick={() => onChange(star)}
          style={{
            background: 'none',
            border: 'none',
            cursor: disabled ? 'default' : 'pointer',
            fontSize: '1.75rem',
            lineHeight: 1,
            padding: '0 0.15rem',
            color: star <= value ? '#f5a623' : '#d0d0d0',
          }}
        >
          {star <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}
