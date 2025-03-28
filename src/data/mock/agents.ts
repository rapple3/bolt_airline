import { AgentHandoff } from '../../types/agent';
import { generateBookings } from './bookings';
import { generateFlights } from './flights';

const problemTypes = [
  'Flight Cancellation',
  'Booking Modification',
  'Special Assistance Request',
  'Baggage Issue',
  'Payment Problem'
];

const attemptedSolutions = [
  ['Checked flight status', 'Attempted online rebooking'],
  ['Tried self-service modification', 'Checked alternative flights'],
  ['Reviewed special assistance options', 'Checked documentation requirements'],
  ['Tracked baggage status', 'Filed baggage claim'],
  ['Verified payment method', 'Checked refund status']
];

const nextSteps = [
  ['Review cancellation policy', 'Process refund', 'Offer alternative flights'],
  ['Process booking changes', 'Update seat assignments', 'Send confirmation'],
  ['Arrange special assistance', 'Coordinate with airport staff', 'Update booking notes'],
  ['Initiate baggage search', 'Process compensation claim', 'Arrange delivery'],
  ['Process payment issue', 'Update booking status', 'Send confirmation']
];

// Generate agent handoff data
export const generateAgentHandoff = (customerId: string, customerName: string): AgentHandoff => {
  const flights = generateFlights(5);
  const booking = generateBookings(1, customerId, customerName, flights)[0];
  const problemIndex = Math.floor(Math.random() * problemTypes.length);
  
  return {
    customerId,
    bookingDetails: booking,
    problemSummary: `Customer experiencing issues with ${problemTypes[problemIndex].toLowerCase()}`,
    attemptedSolutions: attemptedSolutions[problemIndex],
    nextSteps: nextSteps[problemIndex]
  };
};

// Generate multiple agent handoffs
export const generateAgentHandoffs = (count: number, customerIds: string[], customerNames: string[]): AgentHandoff[] => {
  return Array.from({ length: count }, (_, i) => {
    const index = i % customerIds.length;
    return generateAgentHandoff(customerIds[index], customerNames[index]);
  });
}; 