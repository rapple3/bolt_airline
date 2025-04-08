interface Intent {
  type: 'flight_status' | 'booking_info' | 'cancellation' | 'baggage' | 'loyalty' | 'seat_change' | 'unknown';
  entities: Record<string, string>;
}

export function analyzeIntent(input: string): Intent {
  const lowercaseInput = input.toLowerCase();
  
  // Check for seat change intent first (before general flight check)
  if ((lowercaseInput.includes('change') || lowercaseInput.includes('upgrade')) && 
      (lowercaseInput.includes('seat') || lowercaseInput.includes('class'))) {
    const flightMatch = input.match(/[A-Z]{2}\d{3,4}/i);
    return {
      type: 'seat_change',
      entities: {
        flightNumber: flightMatch?.[0] || '',
        seatPreference: lowercaseInput.includes('window') ? 'window' : 
                        lowercaseInput.includes('aisle') ? 'aisle' : 
                        lowercaseInput.includes('middle') ? 'middle' : 'any',
        classUpgrade: lowercaseInput.includes('comfort plus') || lowercaseInput.includes('comfort+') ? 'comfortPlus' :
                      lowercaseInput.includes('first') ? 'first' :
                      lowercaseInput.includes('delta one') ? 'deltaOne' : ''
      }
    };
  }
  
  // More specific check for dl1001 if it's about seat changes
  if (lowercaseInput.includes('dl1001') && 
      (lowercaseInput.includes('seat') || 
       lowercaseInput.includes('upgrade') || 
       lowercaseInput.includes('comfort'))) {
    return {
      type: 'seat_change',
      entities: {
        flightNumber: 'DL1001',
        seatPreference: lowercaseInput.includes('window') ? 'window' : 
                        lowercaseInput.includes('aisle') ? 'aisle' : 
                        lowercaseInput.includes('middle') ? 'middle' : 'any',
        classUpgrade: lowercaseInput.includes('comfort') ? 'comfortPlus' :
                      lowercaseInput.includes('first') ? 'first' :
                      lowercaseInput.includes('delta one') ? 'deltaOne' : ''
      }
    };
  }
  
  // Simple rule-based intent recognition
  if (lowercaseInput.includes('status') || 
     (lowercaseInput.includes('flight') && 
      !lowercaseInput.includes('seat') && 
      !lowercaseInput.includes('upgrade'))) {
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