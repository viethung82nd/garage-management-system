import { useCallback, useState } from 'react'

export type ApiMessageTone = 'success' | 'error'

/**
 * Every back-office page tracks one status line for its last API call, but
 * used to hardcode <InlineBanner tone="error"> even for success messages
 * ("Quote sent to the customer.") — this pairs the message with its real
 * tone so success reads as success.
 */
export function useApiMessage() {
  const [message, setMessage] = useState<string>()
  const [tone, setTone] = useState<ApiMessageTone>('error')

  const showError = useCallback((value: string) => {
    setTone('error')
    setMessage(value)
  }, [])

  const showSuccess = useCallback((value: string) => {
    setTone('success')
    setMessage(value)
  }, [])

  const clear = useCallback(() => setMessage(undefined), [])

  return { message, tone, showError, showSuccess, clear }
}
