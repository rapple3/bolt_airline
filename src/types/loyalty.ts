export interface LoyaltyData {
  customerId: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  tierBenefits: string[];
} 