// One-off import: Farsan Cost PP + Sweet Costing Sheet, verbatim from the
// source workbooks (2026-09-23). Run once; re-running would duplicate rows
// since this is reference data with no natural unique key to upsert on.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ASOF = new Date(); // today — both sheets were shared today, no other date in either source

async function main() {
  const existingFarsan = await prisma.costingItem.count({ where: { category: "Farsan" } });
  if (existingFarsan > 0) {
    console.log(`Farsan already has ${existingFarsan} items — skipping (delete them first if you want to re-import).`);
  } else {
    const farsanItems = [
      { name: "S/W Dhokla", ratePerUnit: 70, servingQtyLabel: "70 gm", servingsPerUnitLabel: "14 Persons", conversionFactor: 14, countPerPlate: "2 NOS", accompanimentsCost: 0.96, tadkaCost: 1.02 },
      { name: "Vati Dal Khaman", ratePerUnit: 72, servingQtyLabel: "70 gm", servingsPerUnitLabel: "14 Persons", conversionFactor: 14, countPerPlate: "2 NOS", accompanimentsCost: 0.96, tadkaCost: 1.02 },
      { name: "Nylon Khaman", ratePerUnit: 90, servingQtyLabel: "70 gm", servingsPerUnitLabel: "14 Persons", conversionFactor: 14, countPerPlate: "2 NOS", accompanimentsCost: 0.96, tadkaCost: 0.63 },
      { name: "Patra", ratePerUnit: 100, servingQtyLabel: "70 gm", servingsPerUnitLabel: "14 Persons", conversionFactor: 14, countPerPlate: "2 NOS", accompanimentsCost: 0.96, tadkaCost: 1.02 },
      { name: "Khandvi", ratePerUnit: 95, servingQtyLabel: "70 gm", servingsPerUnitLabel: "14 Persons", conversionFactor: 14, countPerPlate: "", accompanimentsCost: 0, tadkaCost: 0 },
      { name: "Idada", ratePerUnit: 70, servingQtyLabel: "70 gm", servingsPerUnitLabel: "14 Persons", conversionFactor: 14, countPerPlate: "3 NOS", accompanimentsCost: 0.96, tadkaCost: 1.02 },
      { name: "Chinese Samosa", ratePerUnit: 3.5, servingQtyLabel: "2 Nos.", servingsPerUnitLabel: "1 Person", costBasis: "PER_PIECE", conversionFactor: 2, countPerPlate: "2 NOS", accompanimentsCost: null, tadkaCost: null },
      { name: "Navtad Samosa", ratePerUnit: 3, servingQtyLabel: "2 Nos.", servingsPerUnitLabel: "1 Person", costBasis: "PER_PIECE", conversionFactor: 2, countPerPlate: "2 NOS", accompanimentsCost: null, tadkaCost: null },
      { name: "Handvo", ratePerUnit: 135, servingQtyLabel: "70 gm", servingsPerUnitLabel: "14 Persons", conversionFactor: 14, countPerPlate: "-", accompanimentsCost: 0, tadkaCost: 0 },
      { name: "Khamani", ratePerUnit: 72, servingQtyLabel: "70 gm", servingsPerUnitLabel: "14 Persons", conversionFactor: 14, countPerPlate: "", accompanimentsCost: 0.96, tadkaCost: 0 },
      { name: "Idli", ratePerUnit: 3, servingQtyLabel: "2 Nos.", servingsPerUnitLabel: "1 Person", costBasis: "PER_PIECE", conversionFactor: 2, countPerPlate: "2 NOS", accompanimentsCost: 0, tadkaCost: 0 },
    ];
    for (let i = 0; i < farsanItems.length; i++) {
      const it = farsanItems[i];
      await prisma.costingItem.create({
        data: {
          category: "Farsan",
          name: it.name,
          ratePerUnit: it.ratePerUnit,
          servingQtyLabel: it.servingQtyLabel,
          servingsPerUnitLabel: it.servingsPerUnitLabel,
          costBasis: it.costBasis ?? "PER_KG",
          conversionFactor: it.conversionFactor,
          wastagePct: 10,
          countPerPlate: it.countPerPlate,
          accompanimentsCost: it.accompanimentsCost,
          tadkaCost: it.tadkaCost,
          asOfDate: ASOF,
          sortOrder: i,
          enteredBy: "import",
        },
      });
    }
    console.log(`Imported ${farsanItems.length} Farsan items.`);
  }

  const existingSweets = await prisma.costingRecipe.count({ where: { category: "Sweets" } });
  if (existingSweets > 0) {
    console.log(`Sweets already has ${existingSweets} recipes — skipping (delete them first if you want to re-import).`);
    await prisma.$disconnect();
    return;
  }

  const sweets: { name: string; batchQty: number; batchUnit: string; servingLabel: string; servingConversionFactor: number; ingredients: { name: string; qtyLabel: string; amount: number }[] }[] = [
    {
      name: "Gulab Jamun", batchQty: 11500, batchUnit: "Nos", servingLabel: "1 Pc (35g)", servingConversionFactor: 1,
      ingredients: [
        { name: "Gulab Jamun Aata", qtyLabel: "75 Kg", amount: 22125 },
        { name: "Sugar", qtyLabel: "150 Kg", amount: 7050 },
        { name: "Water", qtyLabel: "150 Ltr", amount: 499 },
        { name: "Oil", qtyLabel: "20 Ltr", amount: 2400 },
        { name: "Gas", qtyLabel: "41 KG", amount: 5800 },
        { name: "Approx Labour", qtyLabel: "4 Person", amount: 5000 },
        { name: "Transportation", qtyLabel: "1", amount: 500 },
        { name: "Overheads Expense", qtyLabel: "", amount: 1000 },
        { name: "Wastage Ratio (500 Nos)", qtyLabel: "500 Nos", amount: 1850 },
      ],
    },
    {
      name: "Sooji Sheera", batchQty: 550, batchUnit: "KG", servingLabel: "70 GM", servingConversionFactor: 0.07,
      ingredients: [
        { name: "Sooji", qtyLabel: "110 KG", amount: 5720 },
        { name: "Oil", qtyLabel: "60 LIT", amount: 9600 },
        { name: "Water", qtyLabel: "280 LIT", amount: 42 },
        { name: "Ghee", qtyLabel: "5 KG", amount: 3000 },
        { name: "Sugar", qtyLabel: "110 KG", amount: 5170 },
        { name: "Approx Labour", qtyLabel: "2", amount: 2000 },
        { name: "Gas", qtyLabel: "41 KG", amount: 5800 },
        { name: "Elaichi", qtyLabel: "1 KG", amount: 2800 },
        { name: "Dry Fruit", qtyLabel: "5 KG", amount: 2700 },
        { name: "Transportation", qtyLabel: "", amount: 700 },
        { name: "Overheads", qtyLabel: "", amount: 1000 },
        { name: "Wastage", qtyLabel: "", amount: 1751 },
      ],
    },
    {
      name: "Moong Dal Halwa", batchQty: 550, batchUnit: "KG", servingLabel: "70 GM", servingConversionFactor: 0.07,
      ingredients: [
        { name: "Moong Dal", qtyLabel: "150 KG", amount: 15600 },
        { name: "Sugar", qtyLabel: "150 KG", amount: 6110 },
        { name: "Oil", qtyLabel: "90 KG", amount: 14400 },
        { name: "Water", qtyLabel: "280 LIT", amount: 84 },
        { name: "Gas", qtyLabel: "57 KG", amount: 8151 },
        { name: "Elaichi", qtyLabel: "1 KG", amount: 2800 },
        { name: "Dry Fruit", qtyLabel: "5 KG", amount: 2700 },
        { name: "Ghee", qtyLabel: "5 KG", amount: 3000 },
        { name: "Approx Labour", qtyLabel: "4", amount: 4000 },
        { name: "Wastage Ratio 20 KG", qtyLabel: "20 KG", amount: 2187.2 },
        { name: "Transportation", qtyLabel: "", amount: 1000 },
        { name: "Overheads", qtyLabel: "", amount: 1000 },
      ],
    },
    {
      name: "Doodhi Halwa", batchQty: 550, batchUnit: "KG", servingLabel: "70 GM", servingConversionFactor: 0.07,
      ingredients: [
        { name: "Doodhi", qtyLabel: "800 KG", amount: 13600 },
        { name: "Sugar", qtyLabel: "150 KG", amount: 7050 },
        { name: "Oil", qtyLabel: "15 LIT", amount: 2400 },
        { name: "Approx Labour", qtyLabel: "6", amount: 6000 },
        { name: "Gas", qtyLabel: "57 KG", amount: 8151 },
        { name: "Elaichi", qtyLabel: "500 GM", amount: 1400 },
        { name: "Dry Fruit", qtyLabel: "5 KG", amount: 2700 },
        { name: "Milk Powder", qtyLabel: "10 KG", amount: 3800 },
        { name: "Coconut Powder", qtyLabel: "10 KG", amount: 2000 },
        { name: "Gulab Jamun Powder", qtyLabel: "10 KG", amount: 2950 },
        { name: "Transportation", qtyLabel: "", amount: 1000 },
        { name: "Overheads", qtyLabel: "", amount: 1000 },
        { name: "Wastage Ratio 15 KG", qtyLabel: "15 KG", amount: 1528.95 },
      ],
    },
    {
      name: "Carrot Halwa", batchQty: 550, batchUnit: "KG", servingLabel: "70 GM", servingConversionFactor: 0.07,
      ingredients: [
        { name: "Carrot", qtyLabel: "800 KG", amount: 17600 },
        { name: "Sugar", qtyLabel: "150 KG", amount: 7050 },
        { name: "Oil", qtyLabel: "15 LIT", amount: 2400 },
        { name: "Approx Labour", qtyLabel: "6", amount: 6000 },
        { name: "Gas", qtyLabel: "57 KG", amount: 8151 },
        { name: "Elaichi", qtyLabel: "500 GM", amount: 1400 },
        { name: "Dry Fruit", qtyLabel: "5 KG", amount: 2700 },
        { name: "Milk Powder", qtyLabel: "10 KG", amount: 3800 },
        { name: "Coconut Powder", qtyLabel: "10 KG", amount: 2000 },
        { name: "Gulab Jamun Powder", qtyLabel: "10 KG", amount: 2950 },
        { name: "Transportation", qtyLabel: "", amount: 1000 },
        { name: "Overheads", qtyLabel: "", amount: 1000 },
        { name: "Wastage Ratio 15 KG", qtyLabel: "15 KG", amount: 1543.65 },
      ],
    },
    {
      name: "Sevaiya Paysham", batchQty: 450, batchUnit: "KG", servingLabel: "70 GM", servingConversionFactor: 0.07,
      ingredients: [
        { name: "Sevaiya", qtyLabel: "90 KG", amount: 5400 },
        { name: "Milk", qtyLabel: "120 LIT", amount: 7800 },
        { name: "Sugar", qtyLabel: "90 KG", amount: 4230 },
        { name: "Ghee", qtyLabel: "5 KG", amount: 3000 },
        { name: "Water", qtyLabel: "250 LIT", amount: 75 },
        { name: "Approx Labour", qtyLabel: "2", amount: 2000 },
        { name: "Dry Fruit", qtyLabel: "7", amount: 3780 },
        { name: "Elaichi", qtyLabel: "500 GM", amount: 1400 },
        { name: "Oil", qtyLabel: "15 LIT", amount: 2400 },
        { name: "Gas", qtyLabel: "19 KG", amount: 2717 },
        { name: "Transportation", qtyLabel: "", amount: 1000 },
        { name: "Overheads", qtyLabel: "", amount: 1000 },
        { name: "Wastage Ratio 15 KG", qtyLabel: "15 KG", amount: 1219.95 },
        { name: "Corn Flour", qtyLabel: "10 KG", amount: 450 },
      ],
    },
    {
      name: "Rice Kheer", batchQty: 450, batchUnit: "KG", servingLabel: "70 GM", servingConversionFactor: 0.07,
      ingredients: [
        { name: "Rice", qtyLabel: "90 KG", amount: 4050 },
        { name: "Milk", qtyLabel: "120 LIT", amount: 7800 },
        { name: "Sugar", qtyLabel: "90 KG", amount: 4230 },
        { name: "Ghee", qtyLabel: "5 KG", amount: 3000 },
        { name: "Water", qtyLabel: "250 LIT", amount: 75 },
        { name: "Approx Labour", qtyLabel: "2", amount: 2000 },
        { name: "Dry Fruit", qtyLabel: "7", amount: 3780 },
        { name: "Elaichi", qtyLabel: "500 GM", amount: 1400 },
        { name: "Oil", qtyLabel: "15 LIT", amount: 2400 },
        { name: "Gas", qtyLabel: "38 KG", amount: 5434 },
        { name: "Transportation", qtyLabel: "", amount: 1000 },
        { name: "Overheads", qtyLabel: "", amount: 1000 },
        { name: "Wastage Ratio 15 KG", qtyLabel: "15 KG", amount: 1247.25 },
        { name: "Corn Flour", qtyLabel: "10 KG", amount: 450 },
      ],
    },
    {
      name: "Mohanthal", batchQty: 550, batchUnit: "KG", servingLabel: "70 GM", servingConversionFactor: 0.07,
      ingredients: [
        { name: "Besan Mota", qtyLabel: "110 KG", amount: 7040 },
        { name: "Oil", qtyLabel: "90 LIT", amount: 14400 },
        { name: "Water", qtyLabel: "280 LIT", amount: 84 },
        { name: "Ghee", qtyLabel: "5 KG", amount: 3000 },
        { name: "Sugar", qtyLabel: "110 KG", amount: 5720 },
        { name: "Approx Labour", qtyLabel: "", amount: 5500 },
        { name: "Gas", qtyLabel: "47 KG", amount: 6721 },
        { name: "Elaichi", qtyLabel: "1 KG", amount: 2800 },
        { name: "Dry Fruit", qtyLabel: "5 KG", amount: 2700 },
        { name: "Transportation", qtyLabel: "", amount: 1000 },
        { name: "Overheads", qtyLabel: "", amount: 1000 },
        { name: "Wastage Ratio 30 KG", qtyLabel: "30 KG", amount: 2877 },
      ],
    },
    {
      name: "Coconut Barafi", batchQty: 500, batchUnit: "KG", servingLabel: "1 Pc (~70g)", servingConversionFactor: 0.07,
      ingredients: [
        { name: "Sugar", qtyLabel: "120 KG", amount: 5640 },
        { name: "Approx Labour", qtyLabel: "3", amount: 3000 },
        { name: "Gas", qtyLabel: "19 KG", amount: 2717 },
        { name: "Coconut Powder", qtyLabel: "125 KG", amount: 25000 },
        { name: "Sooji", qtyLabel: "20", amount: 1040 },
        { name: "Water", qtyLabel: "80 LTR", amount: 24 },
        { name: "Transportation", qtyLabel: "", amount: 1000 },
        { name: "Overheads", qtyLabel: "", amount: 1000 },
        { name: "Labour", qtyLabel: "", amount: 4000 },
        { name: "Oil", qtyLabel: "10 LTR", amount: 1600 },
        { name: "Elaichi Powder", qtyLabel: "500 GM", amount: 1500 },
        { name: "Wastage Ratio 25 KG", qtyLabel: "25 KG", amount: 2400 },
      ],
    },
  ];

  for (let i = 0; i < sweets.length; i++) {
    const s = sweets[i];
    await prisma.costingRecipe.create({
      data: {
        category: "Sweets",
        name: s.name,
        batchQty: s.batchQty,
        batchUnit: s.batchUnit,
        servingLabel: s.servingLabel,
        servingConversionFactor: s.servingConversionFactor,
        asOfDate: ASOF,
        sortOrder: i,
        enteredBy: "import",
        ingredients: { create: s.ingredients.map((ing, j) => ({ ...ing, sortOrder: j })) },
      },
    });
  }
  console.log(`Imported ${sweets.length} Sweets recipes.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
