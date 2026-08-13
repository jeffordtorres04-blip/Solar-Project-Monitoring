const crypto = require("crypto");

module.exports = async function seedInventory({ run }) {
  const items = [
    { name: "540W Monocrystalline Module", category: "Modules", sku: "MOD-540-MC", quantity: 340, unit: "pcs", reorderLevel: 100, supplier: "SunTech Philippines", unitCost: 4600 },
    { name: "String Inverter 25kW", category: "Inverters", sku: "INV-STR-25K", quantity: 6, unit: "units", reorderLevel: 8, supplier: "Huawei FusionSolar", unitCost: 103600 },
    { name: "Ground Mount Racking Rail (4m)", category: "Racking", sku: "RCK-RAIL-4M", quantity: 210, unit: "pcs", reorderLevel: 150, supplier: "Davao Steel Works", unitCost: 1350 },
    { name: "DC Solar Cable 6mm² (100m roll)", category: "Cabling", sku: "CBL-DC-6MM", quantity: 4, unit: "rolls", reorderLevel: 5, supplier: "Phelps Dodge PH", unitCost: 8100 },
    { name: "MC4 Connector Pair", category: "Electrical", sku: "ELC-MC4-PR", quantity: 850, unit: "sets", reorderLevel: 200, supplier: "Staubli Electrical", unitCost: 67 },
    { name: "Torque Wrench Set", category: "Tools", sku: "TL-TRQ-SET", quantity: 3, unit: "sets", reorderLevel: 4, supplier: "Local Hardware Supply", unitCost: 11800 },
  ];

  for (const i of items) {
    await run(
      "INSERT INTO inventory_items (id, name, category, sku, quantity, unit, reorder_level, supplier, unit_cost) VALUES (?,?,?,?,?,?,?,?,?)",
      [crypto.randomUUID(), i.name, i.category, i.sku, i.quantity, i.unit, i.reorderLevel, i.supplier, i.unitCost]
    );
  }
};
