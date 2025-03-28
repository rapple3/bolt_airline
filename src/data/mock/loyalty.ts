import { LoyaltyData } from '../../types/loyalty';

// Generate loyalty data
export const generateLoyaltyData = (customerId: string): LoyaltyData => {
  const tierOptions = ['bronze', 'silver', 'gold', 'platinum'] as const;
  const tierIndex = Math.floor(Math.random() * 4);
  const tier = tierOptions[tierIndex];
  
  const baseBenefits = ['Priority Check-in', 'Bonus Miles on Flights'];
  const silverBenefits = [...baseBenefits, 'Extra Baggage Allowance'];
  const goldBenefits = [...silverBenefits, 'Lounge Access', 'Priority Boarding'];
  const platinumBenefits = [...goldBenefits, 'Complimentary Upgrades', 'Partner Benefits'];
  
  const tierBenefits = 
    tier === 'bronze' ? baseBenefits :
    tier === 'silver' ? silverBenefits :
    tier === 'gold' ? goldBenefits :
    platinumBenefits;
  
  const points = (tierIndex + 1) * 15000 + Math.floor(Math.random() * 10000);
  
  return {
    customerId,
    tier,
    points,
    tierBenefits,
  };
};

// Generate multiple loyalty records
export const generateLoyaltyRecords = (customerIds: string[]): LoyaltyData[] => {
  return customerIds.map(id => generateLoyaltyData(id));
}; 