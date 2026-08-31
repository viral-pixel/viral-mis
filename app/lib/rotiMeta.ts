// Default masters for the Roti / Meal Count sub-module (Kiran Parmar), taken
// from the user's real "Roti Format_Kiran.xlsx" sheet. All three lists are
// just a starting point — Admin can add/delete sites, meal types, and
// categories from the Manage Masters screen at any time; nothing here is
// hardcoded into the app beyond this initial seed.

export const ROTI_SUBMODULE_SLUG = "kiran-roti-count";

export const ROTI_DEFAULT_SITES: string[] = [
  "Intas Matoda",
  "Intas SEZ",
  "IBPL",
  "Finar",
  "O2H",
  "INOX",
  "Veeglow",
  "Unison",
  "TTEC",
  "Central Kitchen",
  "Laundry",
  "Lumax",
];

export const ROTI_DEFAULT_MEAL_TYPES: string[] = ["Lunch", "Dinner"];

export const ROTI_DEFAULT_CATEGORIES: string[] = ["Roti", "Paratha", "Poori", "Thepla"];
