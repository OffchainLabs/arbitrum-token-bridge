export function requestNotificationPermission() {
  // Check if the browser supports notifications
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications.')
    return
  }
  return Notification.requestPermission()
}

export function createNotification({ text }: { text: string }) {
  const img = '/logo.png'
  const notification = new Notification('Arbitrum Token Bridge', {
    body: text,
    icon: img
  })
  return notification
}

export function getNotificationsPermission():
  | NotificationPermission
  | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}
