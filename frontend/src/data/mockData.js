// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AgriFlow Mock Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Local farm images moved into `public/images`.
const localImages = [
  '/maize.jpg',
  '/rice.jpg',
  '/tomato.jpg',
  '/hero.png'
];

function randImage() {
  return localImages[Math.floor(Math.random() * localImages.length)];
}

function pickImages(n) {
  const available = [...localImages];
  const picked = [];
  while (picked.length < n && available.length) {
    const i = Math.floor(Math.random() * available.length);
    picked.push(available.splice(i, 1)[0]);
  }
  return picked;
}

function computePayoutFields(p) {
  const amount = typeof p.amount_invested === 'number' ? p.amount_invested : null;
  const payout = typeof p.payout_amount === 'number' ? p.payout_amount : null;
  let profit = null;
  let totalToSend = null;

  if (typeof p.profit === 'number') {
    profit = p.profit;
  } else if (payout != null && amount != null) {
    // Heuristic: if payout_amount looks like profit (<= principal) treat as profit-only
    profit = payout <= amount ? payout : (payout - amount);
  } else if (payout != null) {
    profit = payout;
  }

  if (typeof p.totalToSend === 'number') {
    totalToSend = p.totalToSend;
  } else if (amount != null && profit != null) {
    totalToSend = amount + profit;
  } else if (payout != null) {
    // fallback: assume payout_amount is total
    totalToSend = payout;
  }

  return { ...p, profit, totalToSend };
}
export const mockFarms = [
  {
    id: '1',
    name: 'Oduya Maize Farm',
    crop: 'Maize',
    cropTag: 'Maize',
    farmer: { name: 'Chukwuemeka Oduya', firstName: 'Chukwuemeka', state: 'Kaduna', bio: 'Third-generation farmer with 12 years of commercial maize cultivation experience in the North Central region.', memberSince: '2023', totalFarms: 3, trustScore: 82 },
    location: { state: 'Kaduna', lga: 'Chikun' },
    total_budget: 1200000,
    amount_raised: 840000,
    investors: 14,
    daysLeft: 18,
    expectedYield: 4.2,
    yieldUnit: 'tons',
    closingDate: '2026-03-14',
    status: 'active',
    description: 'A 5-hectare maize farm operating under the Kaduna State Agricultural Development Programme. We plant an improved hybrid seed variety (SAMMAZ 15) with drip irrigation, targeting a 4.2 tonne/hectare yield. Funds will cover seed, fertilizers, herbicides, labour, and transport to off-takers in Abuja.',
    photos: ['/maize.jpg'],
    budget: {
      total: 1200000,
      stages: [
        { name: 'Planting', amount: 320000, percent: 26.7, status: 'verified' },
        { name: 'Chemicals', amount: 240000, percent: 20.0, status: 'in_progress' },
        { name: 'Weeding', amount: 180000, percent: 15.0, status: 'pending' },
        { name: 'Harvesting', amount: 280000, percent: 23.3, status: 'pending' },
        { name: 'Transport', amount: 120000, percent: 10.0, status: 'pending' },
        { name: 'Misc', amount: 60000, percent: 5.0, status: 'pending' },
      ]
    },
    milestones: [
      { id: 'm1', name: 'Land Preparation & Planting', dueDate: '2026-01-15', status: 'verified', budgetAllocated: 320000, released: 320000, proofs: [
        { id: 'p1', type: 'image', url: randImage(), uploadDate: '2026-01-10', adminNote: 'GPS coordinates match reported location. Crop density visible.', status: 'approved' }
      ]},
      { id: 'm2', name: 'Fertilizer & Chemical Application', dueDate: '2026-02-10', status: 'in_progress', budgetAllocated: 240000, released: null, proofs: [
        { id: 'p2', type: 'image', url: randImage(), uploadDate: '2026-02-08', adminNote: null, status: 'pending' }
      ]},
      { id: 'm3', name: 'Weeding & Crop Management', dueDate: '2026-03-01', status: 'pending', budgetAllocated: 180000, released: null, proofs: [] },
      { id: 'm4', name: 'Harvesting', dueDate: '2026-04-20', status: 'pending', budgetAllocated: 280000, released: null, proofs: [] },
      { id: 'm5', name: 'Sales & Distribution', dueDate: '2026-05-15', status: 'pending', budgetAllocated: 120000, released: null, proofs: [] },
    ],
    return_rate: 0.24,
    min_investment: 5000,
    harvest_share: 42,
    harvest_unit: 'kg of maize',
    transparencyScore: { budgetDisclosed: true, proofsUploaded: true, adminVerified: true, yieldReported: false },
    startDate: '2026-01-01',
    endDate: '2026-05-31',
  },
  {
    id: '2',
    name: 'Bello Rice Cooperative',
    crop: 'Rice',
    cropTag: 'Rice',
    farmer: { name: 'Fatima Bello', firstName: 'Fatima', state: 'Kebbi', bio: 'Cooperative leader managing 20 smallholder farmers in the Kebbi State rice belt.', memberSince: '2024', totalFarms: 1, trustScore: 65 },
    location: { state: 'Kebbi', lga: 'Birnin Kebbi' },
    total_budget: 2000000,
    amount_raised: 560000,
    investors: 8,
    daysLeft: 32,
    expectedYield: 8.5,
    yieldUnit: 'tons',
    closingDate: '2026-03-25',
    status: 'active',
    description: 'A cooperative of 20 farmers cultivating 10 hectares of paddy rice in the Kebbi State rice belt. With access to the Kainji dam irrigation scheme, we achieve two growing seasons annually. This round funds the second season: seed, fertilizer, harvesting, and milling costs.',
    photos: ['/rice.jpg'],
    budget: {
      total: 2000000,
      stages: [
        { name: 'Planting', amount: 500000, percent: 25.0, status: 'verified' },
        { name: 'Chemicals', amount: 400000, percent: 20.0, status: 'pending' },
        { name: 'Weeding', amount: 300000, percent: 15.0, status: 'pending' },
        { name: 'Harvesting', amount: 500000, percent: 25.0, status: 'pending' },
        { name: 'Milling', amount: 200000, percent: 10.0, status: 'pending' },
        { name: 'Misc', amount: 100000, percent: 5.0, status: 'pending' },
      ]
    },
    milestones: [
      { id: 'm1', name: 'Field Preparation & Seed Purchase', dueDate: '2026-01-20', status: 'verified', budgetAllocated: 500000, released: 500000, proofs: [
        { id: 'p1', type: 'image', url: randImage(), uploadDate: '2026-01-18', adminNote: 'Seed purchase receipts verified. Field photos match coordinates.', status: 'approved' }
      ]},
      { id: 'm2', name: 'Transplanting & Fertilizer', dueDate: '2026-03-01', status: 'pending', budgetAllocated: 400000, released: null, proofs: [] },
      { id: 'm3', name: 'Harvesting & Milling', dueDate: '2026-05-30', status: 'pending', budgetAllocated: 700000, released: null, proofs: [] },
    ],
    return_rate: 0.19,
    min_investment: 5000,
    harvest_share: 25,
    harvest_unit: 'kg of rice',
    transparencyScore: { budgetDisclosed: true, proofsUploaded: true, adminVerified: true, yieldReported: false },
    startDate: '2026-01-10',
    endDate: '2026-06-30',
  },
  {
    id: '3',
    name: 'Adeyemi Tomato Estate',
    crop: 'Tomatoes',
    cropTag: 'Tomatoes',
    farmer: { name: 'Olawale Adeyemi', firstName: 'Olawale', state: 'Ogun', bio: 'Precision agriculture practitioner with a BSc in Agronomy from FUTA. Specialises in greenhouse and open-field tomato cultivation.', memberSince: '2023', totalFarms: 2, trustScore: 90 },
    location: { state: 'Ogun', lga: 'Abeokuta South' },
    total_budget: 800000,
    amount_raised: 800000,
    investors: 22,
    daysLeft: 0,
    expectedYield: 18,
    yieldUnit: 'tons',
    closingDate: '2026-02-01',
    status: 'funded',
    description: 'Three hectares of hybrid tomato planting for Lagos wholesale markets. We use drip irrigation, staking and trellis systems, and integrated pest management. The proximity to Lagos — under 90 minutes — ensures freshness and eliminates cold-chain dependency.',
    photos: ['/tomato.jpg'],
    budget: {
      total: 800000,
      stages: [
        { name: 'Planting', amount: 200000, percent: 25.0, status: 'verified' },
        { name: 'Irrigation Setup', amount: 160000, percent: 20.0, status: 'verified' },
        { name: 'Chemicals', amount: 120000, percent: 15.0, status: 'verified' },
        { name: 'Harvesting', amount: 200000, percent: 25.0, status: 'in_progress' },
        { name: 'Transport', amount: 80000, percent: 10.0, status: 'pending' },
        { name: 'Misc', amount: 40000, percent: 5.0, status: 'pending' },
      ]
    },
    milestones: [
      { id: 'm1', name: 'Planting & Setup', dueDate: '2025-12-15', status: 'verified', budgetAllocated: 360000, released: 360000, proofs: [
        { id: 'p1', type: 'image', url: randImage(), uploadDate: '2025-12-12', adminNote: 'Irrigation infrastructure confirmed. Planting density meets spec.', status: 'approved' }
      ]},
      { id: 'm2', name: 'Spraying & Crop Management', dueDate: '2026-01-20', status: 'verified', budgetAllocated: 120000, released: 120000, proofs: [
        { id: 'p1', type: 'image', url: randImage(), uploadDate: '2026-01-18', adminNote: null, status: 'approved' }
      ]},
      { id: 'm3', name: 'Harvest & Sales', dueDate: '2026-03-10', status: 'in_progress', budgetAllocated: 320000, released: null, proofs: [] },
    ],
    return_rate: 0.21,
    min_investment: 5000,
    transparencyScore: { budgetDisclosed: true, proofsUploaded: true, adminVerified: true, yieldReported: false },
    startDate: '2025-12-01',
    endDate: '2026-03-31',
  },
  {
    id: '4',
    name: 'Nwosu Cassava Processing Farm',
    crop: 'Cassava',
    cropTag: 'Cassava',
    farmer: { name: 'Ngozi Nwosu', firstName: 'Ngozi', state: 'Anambra', bio: 'Runs an end-to-end cassava value chain — from cultivation to garri and flour processing.', memberSince: '2024', totalFarms: 1, trustScore: 0 },
    location: { state: 'Anambra', lga: 'Awka South' },
    total_budget: 1500000,
    amount_raised: 225000,
    investors: 4,
    daysLeft: 45,
    expectedYield: 12,
    yieldUnit: 'tons',
    closingDate: '2026-04-07',
    status: 'active',
    description: 'Eight hectares of TME 419 cassava variety targeting the garri and starch processing market. The farm has an existing processing mini-factory. This funding covers stem cuttings, fertilizer, and labour. Returns include a share of the processed output or cash equivalent at market rate.',
    photos: [randImage()],
    budget: {
      total: 1500000,
      stages: [
        { name: 'Stem Cuttings', amount: 300000, percent: 20.0, status: 'pending' },
        { name: 'Planting Labour', amount: 375000, percent: 25.0, status: 'pending' },
        { name: 'Fertilizer', amount: 375000, percent: 25.0, status: 'pending' },
        { name: 'Harvesting', amount: 300000, percent: 20.0, status: 'pending' },
        { name: 'Processing', amount: 150000, percent: 10.0, status: 'pending' },
      ]
    },
    milestones: [
      { id: 'm1', name: 'Site Prep & Planting', dueDate: '2026-05-01', status: 'pending', budgetAllocated: 675000, released: null, proofs: [] },
      { id: 'm2', name: 'Mid-Cycle Fertilizer Application', dueDate: '2026-08-01', status: 'pending', budgetAllocated: 375000, released: null, proofs: [] },
      { id: 'm3', name: 'Harvesting & Processing', dueDate: '2026-12-01', status: 'pending', budgetAllocated: 450000, released: null, proofs: [] },
    ],
    return_rate: 0.18,
    min_investment: 5000,
    harvest_share: 30,
    harvest_unit: 'kg of garri',
    transparencyScore: { budgetDisclosed: true, proofsUploaded: false, adminVerified: false, yieldReported: false },
    startDate: '2026-04-15',
    endDate: '2027-01-15',
  },
];

export const mockInvestorPortfolio = [
  { id: 'inv1', farmId: '1', farmName: 'Oduya Maize Farm', crop: 'Maize', amount: 50000, expected_return: 62000, milestonesCurrent: 2, milestonesTotal: 5, status: 'active' },
  { id: 'inv2', farmId: '3', farmName: 'Adeyemi Tomato Estate', crop: 'Tomatoes', amount: 25000, expected_return: 30500, milestonesCurrent: 2, milestonesTotal: 3, status: 'active' },
  { id: 'inv3', farmId: '2', farmName: 'Bello Rice Cooperative', crop: 'Rice', amount: 100000, expected_return: 119000, milestonesCurrent: 1, milestonesTotal: 3, status: 'active' },
];

export const mockFarmerFarms = [
  { ...mockFarms[0], status: 'active' },
  { id: 'f2', name: 'Northern Soy Expansion', crop: 'Soybean', status: 'draft', total_budget: 600000, amount_raised: 0, investors: 0, milestonesCurrent: 0, milestonesTotal: 4 },
];

export const mockAdminStats = {
  pendingFarms: 3,
  pendingProofs: 7,
  totalInvested: 45200000,
  activeFarms: 12,
  totalFarms: 22,
  totalInvestors: 148,
  totalFarmers: 34,
  totalFundsRaised: 38500000,
};

export const mockPendingReviews = [
  {
    id: 'pf1',
    farmName: 'Suleiman Maize Farm',
    farmerName: 'Abubakar Suleiman',
    farmerState: 'Niger',
    farmerFarms: 1,
    farmerVerified: false,
    crop: 'Maize',
    location: 'Niger, Bida LGA',
    submittedDate: '2026-02-18',
    budget: 950000,
    size: 4,
    stages: 4,
    startDate: '2026-03-01',
    endDate: '2026-09-30',
    photos: [randImage()],
  },
  {
    id: 'pf2',
    farmName: 'Okoye Plantain Estate',
    farmerName: 'Chidi Okoye',
    farmerState: 'Delta',
    farmerFarms: 2,
    farmerVerified: true,
    crop: 'Plantain',
    location: 'Delta, Warri South LGA',
    submittedDate: '2026-02-19',
    budget: 700000,
    size: 3,
    stages: 3,
    startDate: '2026-04-01',
    endDate: '2026-10-31',
    photos: [],
  },
  {
    id: 'pf3',
    farmName: 'Yusuf Pepper Farm',
    farmerName: 'Ibrahim Yusuf',
    farmerState: 'Kano',
    farmerFarms: 1,
    farmerVerified: false,
    crop: 'Pepper',
    location: 'Kano, Kano Municipal LGA',
    submittedDate: '2026-02-20',
    budget: 400000,
    size: 2,
    stages: 3,
    startDate: '2026-03-15',
    endDate: '2026-07-31',
    photos: [],
  },
];

export const mockPendingFarms = [
  { id: 'pf1', name: 'Suleiman Maize Farm', farmer: 'Abubakar Suleiman', state: 'Niger', crop: 'Maize', submittedDate: '2026-02-18', total_budget: 950000 },
  { id: 'pf2', name: 'Okoye Plantain Estate', farmer: 'Chidi Okoye', state: 'Delta', crop: 'Plantain', submittedDate: '2026-02-19', total_budget: 700000 },
  { id: 'pf3', name: 'Yusuf Pepper Farm', farmer: 'Ibrahim Yusuf', state: 'Kano', crop: 'Pepper', submittedDate: '2026-02-20', total_budget: 400000 },
];

export const mockPendingProofs = [
  { id: 'pp1', milestoneId: 'm2', milestoneName: 'Fertilizer & Chemical Application', farmName: 'Oduya Maize Farm', farmer: 'Chukwuemeka Oduya', uploadDate: '2026-02-08', fileType: 'image', fileUrl: randImage() },
  { id: 'pp2', milestoneId: 'm2', milestoneName: 'Transplanting & Fertilizer', farmName: 'Bello Rice Cooperative', farmer: 'Fatima Bello', uploadDate: '2026-02-10', fileType: 'image', fileUrl: randImage() },
];

export const cropTypes = ['Maize', 'Rice', 'Cassava', 'Tomatoes', 'Soybean', 'Pepper', 'Plantain', 'Yam'];
export const nigeriaStates = ['Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'];

export const mockPayoutFarms = [
  { id: 'pf-1', name: 'Adewale Rice Farm', state: 'Ogun State', total_proceeds: 684000, investor_pool: 273600, farmer_payout: 273600, platform_fee: 136800, total_investors: 8, payouts_completed: 2, remaining_to_disburse: 171000 },
  { id: 'pf-2', name: 'Kano Rice Farm', state: 'Kano State', total_proceeds: 1250000, investor_pool: 500000, farmer_payout: 500000, platform_fee: 250000, total_investors: 15, payouts_completed: 15, remaining_to_disburse: 0 },
  { id: 'pf-3', name: 'Oyo Tomato Project', state: 'Oyo State', total_proceeds: 480000, investor_pool: 192000, farmer_payout: 192000, platform_fee: 96000, total_investors: 5, payouts_completed: 5, remaining_to_disburse: 0 },
];

const _mockAllPayouts = [
  { id: 'pout-1', date: '2026-03-20', farmId: 'pf-1', farmName: 'Adewale Rice Farm', investorName: 'Chukwuemeka Obi', amount_invested: 25000, return_type: 'cash', payout_amount: 31000, bankDetails: 'GTBank — ···6789 — Chukwuemeka Obi', status: 'waiting' },
  { id: 'pout-2', date: '2026-03-20', farmId: 'pf-1', farmName: 'Adewale Rice Farm', investorName: 'Adaeze Okonkwo', amount_invested: 50000, return_type: 'cash', payout_amount: 62000, bankDetails: 'Access Bank — ···1122 — Adaeze Okonkwo', status: 'waiting' },
  { id: 'pout-3', date: '2026-03-20', farmId: 'pf-1', farmName: 'Adewale Rice Farm', investorName: 'Musa Ibrahim', amount_invested: 20000, return_type: 'cash', payout_amount: 24800, bankDetails: 'UBA — ···4455 — Musa Ibrahim', status: 'waiting' },
  { id: 'pout-4', date: '2026-03-20', farmId: 'pf-1', farmName: 'Adewale Rice Farm', investorName: 'Ngozi Nwosu', amount_invested: 100000, return_type: 'cash', payout_amount: 124000, bankDetails: 'Zenith Bank — ···1234 — Ngozi Nwosu', status: 'waiting' },
  { id: 'ph-1', date: '2026-03-14', farmId: 'pf-3', farmName: 'Oyo Tomato Project', investorName: 'Chidi Okoye', return_type: 'cash', amount_invested: 40000, payout_amount: 48400, reference: 'AGF-2026-00101', bankDetails: 'Fidelity Bank — ···0987 — Chidi Okoye', status: 'successful' },
  { id: 'ph-2', date: '2026-03-15', farmId: 'pf-4', farmName: 'Benue Yam Farm', investorName: 'Fatima Bello', return_type: 'cash', amount_invested: 80000, payout_amount: 100000, reference: 'AGF-2026-00102', bankDetails: 'FCMB — ···5678 — Fatima Bello', status: 'successful' }
];

export const mockAllPayouts = _mockAllPayouts.map(computePayoutFields);

// --- Procedural Generation for Pagination Testing ---
const baseNames = ['Adaeze Okonkwo', 'Chukwuemeka Oduya', 'Fatima Bello', 'Musa Ibrahim', 'Adebayo Ola', 'Terwase Akaa'];
const baseFarms = ['Oduya Maize Farm', 'Kano Rice Farm', 'Oyo Tomato Project', 'Benue Yam Farm', 'Northern Soy Expansion'];
for (let i = 0; i < 45; i++) {
  if (i < 25) {
    mockFarms.push({
      ...mockFarms[i % mockFarms.length],
      id: `farm-gen-${i}`,
      name: `${baseFarms[i % baseFarms.length]} ${i + 1}`,
      total_budget: 500000 + (i * 25000),
      amount_raised: 150000 + (i * 15000),
      status: i % 4 === 0 ? 'funded' : (i % 5 === 0 ? 'draft' : 'active')
    });
  }

  mockPendingReviews.push({
    ...mockPendingReviews[i % mockPendingReviews.length],
    id: `pr-gen-${i}`,
    farmName: `${baseFarms[i % baseFarms.length]} Pending ${i + 1}`
  });

  if (i < 15) {
    mockPayoutFarms.push({
      ...mockPayoutFarms[i % mockPayoutFarms.length],
      id: `pf-gen-${i}`,
      name: `${baseFarms[i % baseFarms.length]} ${i + 1}`,
      totalProceeds: 800000 + (i * 50000),
      investorPool: 400000 + (i * 25000),
      state: nigeriaStates[i % nigeriaStates.length],
      payoutsCompleted: i % 3 === 0 ? 10 : 2,
      totalInvestors: 10,
      remainingToDisburse: i % 3 === 0 ? 0 : 300000
    });
  }

  mockAllPayouts.push({
    ...mockAllPayouts[i % mockAllPayouts.length],
    id: `po-gen-${i}`,
    farmId: `pf-gen-${i % 15}`, // Link back to procedurally generated payout farms
    investorName: `${baseNames[i % baseNames.length]} ${i}`,
    amount_invested: 10000 + (i * 3000),
    payout_amount: 12500 + (i * 3500),
    status: i % 5 === 0 ? 'failed' : i % 3 === 0 ? 'successful' : 'waiting'
  });

  // Ensure newly pushed entry has explicit profit/totalToSend fields
  const lastIdx = mockAllPayouts.length - 1;
  mockAllPayouts[lastIdx] = computePayoutFields(mockAllPayouts[lastIdx]);

  mockInvestorPortfolio.push({
    ...mockInvestorPortfolio[i % mockInvestorPortfolio.length],
    id: `inv-port-gen-${i}`,
    farmName: `${baseFarms[i % baseFarms.length]} Investment ${i + 1}`,
    amount: 20000 + (i * 1000),
    expected_return: 24000 + (i * 1200),
    status: i % 2 === 0 ? 'completed' : 'active'
  });

  if (i < 25) {
    mockFarmerFarms.push({
      ...mockFarmerFarms[i % mockFarmerFarms.length],
      id: `myf-gen-${i}`,
      name: `My Farm Project ${i + 1}`,
      status: i % 3 === 0 ? 'funded' : 'active'
    });
  }
}

const baseExpectedPayouts = [
  { id: 'ep1', farmId: 'f1', farmName: 'Oduya Maize Farm', crop: 'Maize', expected: 0.24, return_type: 'cash', expectedDate: '2026-03-30', status: 'Proceeds In', statusStep: 4, invested_amount: 50000, dateStatus: 'imminent' },
  { id: 'ep2', farmId: 'f2', farmName: 'Adeyemi Tomato Estate', crop: 'Tomatoes', expected: 0.21, return_type: 'cash', expectedDate: '2026-03-20', status: 'Paid', statusStep: 5, invested_amount: 25000, dateStatus: 'past' },
  { id: 'ep3', farmId: 'f3', farmName: 'Bello Rice Cooperative', crop: 'Rice', expected: 0.19, return_type: 'cash', expectedDate: '2026-06-15', status: 'Milestones Done', statusStep: 2, invested_amount: 100000, dateStatus: 'future' },
  { id: 'ep4', farmId: 'f4', farmName: 'Northern Soy Expansion', crop: 'Soybean', expected: 0.15, return_type: 'cash', expectedDate: '2026-01-10', status: 'Failed', statusStep: 0, invested_amount: 38000, dateStatus: 'overdue' }
];

export const mockExpectedPayoutsExpanded = Array.from({length: 25}).map((_, i) => ({
  ...baseExpectedPayouts[i % baseExpectedPayouts.length],
  id: `ep-gen-${i}`,
  farmName: `${baseExpectedPayouts[i % baseExpectedPayouts.length].farmName} ${i+1}`,
  invested_amount: baseExpectedPayouts[i % baseExpectedPayouts.length].invested_amount + (i * 500)
}));

