import { useState, useCallback, useEffect } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)
  const show = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])
  return { toast, show }
}

export function Toast({ message }) {
  if (!message) return null
  return <div className="toast">{message}</div>
}
