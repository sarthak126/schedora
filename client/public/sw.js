// Schedora Push Notification Service Worker

self.addEventListener('push', function (event) {
    let data = { title: 'New Notification', message: '' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.message = event.data.text();
        }
    }

    const options = {
        body: data.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.tag || 'schedora-notification',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        actions: [
            { action: 'view', title: 'View Details' },
            { action: 'dismiss', title: 'Dismiss' }
        ],
        data: data.data || {}
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/dashboard/provider';

    if (event.action === 'dismiss') return;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Try to focus an existing window
            for (const client of clientList) {
                if (client.url.includes('/dashboard') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open a new window if none exists
            return clients.openWindow(urlToOpen);
        })
    );
});

self.addEventListener('notificationclose', function (event) {
    // Analytics: notification was dismissed without clicking
});

// Keep service worker alive
self.addEventListener('activate', function (event) {
    event.waitUntil(clients.claim());
});
