import { prisma } from "@/app/lib/prisma";

// Shared by the manual month-entry form (app/api/purchase/months) and the
// Excel importer (app/api/purchase/import) so both go through the exact
// same upsert semantics.
export async function upsertMonthEntries(
  monthDate: Date,
  entries: { itemCategoryId: number; amount: number | null; quantity: number | null }[],
  enteredBy: string
) {
  await prisma.$transaction(
    entries.map((e) =>
      prisma.monthlyPurchase.upsert({
        where: { month_itemCategoryId: { month: monthDate, itemCategoryId: e.itemCategoryId } },
        update: { amount: e.amount, quantity: e.quantity, enteredBy },
        create: { month: monthDate, itemCategoryId: e.itemCategoryId, amount: e.amount, quantity: e.quantity, enteredBy },
      })
    )
  );
}
