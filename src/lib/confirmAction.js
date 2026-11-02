import Swal from 'sweetalert2'

export function confirmAction({ title, text, confirmButtonText = 'Continue', destructive = false, showCancelButton = true }) {
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    showCancelButton,
    confirmButtonText,
    cancelButtonText: 'Cancel',
    confirmButtonColor: destructive ? '#b42318' : '#2860c8',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    focusCancel: showCancelButton,
  })
}