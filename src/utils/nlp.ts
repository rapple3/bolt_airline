interface Intent {
  type: 'flight_status' | 'booking_info' | 'cancellation' | 'baggage' | 'loyalty' | 'unknown';
  entities: Record<string, string>;
}

export function analyzeIntent(input: string): Intent {
  const lowercaseInput = input.toLowerCase();
  
  // Simple rule-based intent recognition
  if (lowercaseInput.includes('status') || lowercaseInput.includes('flight')) {
    const flightMatch = input.match(/[A-Z]{2}\d{3,4}/i);
    return {
      type: 'flight_status',
      entities: {
        flightNumber: flightMatch?.[0] || ''
      }
    };
  }

  if (lowercaseInput.includes('booking') || lowercaseInput.includes('reservation')) {
    const bookingMatch = input.match(/BK\d{5}/i);
    return {
      type: 'booking_info',
      entities: {
        bookingReference: bookingMatch?.[0] || ''
      }
    };
  }

  if (lowercaseInput.includes('cancel')) {
    return {
      type: 'cancellation',
      entities: {}
    };
  }

  if (lowercaseInput.includes('baggage') || lowercaseInput.includes('luggage')) {
    return {
      type: 'baggage',
      entities: {}
    };
  }

  if (lowercaseInput.includes('points') || lowercaseInput.includes('loyalty')) {
    return {
      type: 'loyalty',
      entities: {}
    };
  }

  return {
    type: 'unknown',
    entities: {}
  };
}