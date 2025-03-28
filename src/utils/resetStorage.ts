/**
 * Simple utility to reset localStorage and refresh the page.
 * This can be manually run in the browser console to clear stored data.
 */
export function resetLocalStorage() {
  localStorage.removeItem('airline_app_flights');
  localStorage.removeItem('airline_app_bookings');
  localStorage.removeItem('airline_app_userProfile');
  console.log('Local storage has been cleared. Refreshing page...');
  
  // Wait a short time for console message to be seen
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

// Attach to window for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).resetAirlineStorage = resetLocalStorage;
  console.log('Reset utility loaded. Run window.resetAirlineStorage() to reset app data.');
} 