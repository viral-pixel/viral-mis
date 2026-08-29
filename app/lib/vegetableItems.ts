// Fixed vegetable/fruit master list, in the exact Sr. No. order from the
// user's real workbook ("Vegetable Rate" sheet). Order must never change —
// other sheets/links the user maintains depend on these positions. New
// items get appended after item 70, never inserted or renumbered.

export const VEGETABLE_SUBMODULE_SLUG = "ketan-vegetable-purchase";

export const VEGETABLE_ITEMS: string[] = [
  "Apple", "Banana Raw", "Banana", "Beet", "Beans", "Bottleguard", "Bitterguard",
  "Brinjal Big", "Brocolli", "Broad Beans (Valor)", "Baby Potato", "Cabbage",
  "Capsicum", "Carrot", "Cauliflower", "Coriander Leaves", "Cucumber",
  "Curry Leaves", "Corn", "Corn Frozen", "Corn Baby", "Cluster Beans (Gavar)",
  "Drumstick", "Elephant yam (Suran)", "Garlic", "Garlic Whole", "Ginger",
  "Ginger Old", "Green Garlic", "Green Chilly", "Green Peas", "Green Ravaiya",
  "Ivy Guard", "Methi Leaves", "Mint Leaves", "Ladyfinger", "Lemon",
  "Papaya Raw", "Parwal", "Pumpkin", "Pikador Marcha", "Pineapple",
  "Pomegranate", "Raddish", "Raw Mango", "Spinach", "spring onion",
  "Sponge Guard", "String Beans (fansi)", "Shakkariya", "Surati papadi",
  "Tuver Dana", "Tomato", "Tomato A Quality", "vadhvani marcha", "Suran",
  "Water melon", "Baby Corn", "Valor Papdi", "Yam(ratalu)",
  "Mustard Greens (Sarso)", "Gauva Fruit", "Orange Fruit", "Khajur",
  "Sapodilla (Chiku)", "Grapes", "Muskmelon (Shakkar Teti / Kharbuja)",
  "Ridge Gourd (Turiya)", "Carrot (Gravy)", "Papaya",
];

// The Potato & Onion register's Item field is free text with suggestions
// rather than a rigid master — this small, stable list just seeds the
// datalist. Admin/entry users can type anything.
export const PRODUCE_ITEM_SUGGESTIONS = ["Potato", "Onion", "Garlic", "Baby Potato"];

export const CASH_PURCHASE_CATEGORIES = ["Fruit & Cash Purchase", "Onion & Garlic Flakes"];
