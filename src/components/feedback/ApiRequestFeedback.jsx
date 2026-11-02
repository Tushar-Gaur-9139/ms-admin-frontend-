import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import { API_NOTIFICATION_EVENT, API_REQUEST_STATE_EVENT } from '../../lib/api'

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3200,
  timerProgressBar: true,
  customClass: {
    popup: 'admin-api-toast',
    title: 'admin-api-toast-title',
  },
})

function ApiRequestFeedback({ suppressSpinner = false }) {
  const [requestPending, setRequestPending] = useState(false)
  const [spinnerVisible, setSpinnerVisible] = useState(false)

  useEffect(() => {
    let showTimer

    function handleRequestState(event) {
      setRequestPending(event.detail.loading)
      window.clearTimeout(showTimer)
      if (event.detail.loading) {
        showTimer = window.setTimeout(() => setSpinnerVisible(true), 160)
      } else {
        setSpinnerVisible(false)
      }
    }

    function handleNotification(event) {
      toast.fire({ icon: event.detail.icon, title: event.detail.message })
    }

    window.addEventListener(API_REQUEST_STATE_EVENT, handleRequestState)
    window.addEventListener(API_NOTIFICATION_EVENT, handleNotification)
    return () => {
      window.clearTimeout(showTimer)
      window.removeEventListener(API_REQUEST_STATE_EVENT, handleRequestState)
      window.removeEventListener(API_NOTIFICATION_EVENT, handleNotification)
    }
  }, [])

  if (!requestPending || !spinnerVisible || suppressSpinner) return null

  return (
    <div aria-atomic="true" aria-busy="true" aria-live="polite" className="api-request-overlay" role="status">
      <div className="api-request-indicator">
        <LoaderCircle className="api-request-indicator-icon" size={42} aria-hidden="true" />
        <span>Processing your request</span>
      </div>
    </div>
  )
}

export default ApiRequestFeedback