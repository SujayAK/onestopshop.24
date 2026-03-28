export const INVENTORY_STRUCTURE = {
  Bags: [
    'Shoulder Bags',
    'Tote Bags',
    'Sling Bags',
    'Ethnic Bags',
    'Duffle Bags',
    'Wallets',
    'Tablet Bags'
  ],
  Accessories: [
    'Hair Bows',
    'Nails',
    'Earrings',
    'Bracelets',
    'Necklace',
    'Bag Charms',
    'Sunglasses',
    'Hair Claw Clips',
    'Scarfs',
    'Phone Covers',
    'Travel Pouch'
  ]
};

export function getInventoryRowsFromStructure(structure = INVENTORY_STRUCTURE) {
  const rows = [];

  Object.entries(structure).forEach(([category, subcategories]) => {
    (subcategories || []).forEach((subcategory, index) => {
      rows.push({
        category,
        subcategory,
        sort_order: index + 1,
        active: true
      });
    });
  });

  return rows;
}
