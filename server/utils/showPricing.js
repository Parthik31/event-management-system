const DEFAULT_SHOW_SLOT_PRICING = {
  morning: 0,
  afternoon: 40,
  night: 80
};

export const addMinutesToTime = (time, minutesToAdd = 0) => {
  const [hours = '0', minutes = '0'] = String(time || '00:00').split(':');
  const totalMinutes = Number(hours) * 60 + Number(minutes) + Number(minutesToAdd || 0);
  const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const nextHours = String(Math.floor(normalized / 60)).padStart(2, '0');
  const nextMinutes = String(normalized % 60).padStart(2, '0');
  return `${nextHours}:${nextMinutes}`;
};

export const getTimeDifferenceInMinutes = (time, baseTime) => {
  const [hours = '0', minutes = '0'] = String(time || '00:00').split(':');
  const [baseHours = '0', baseMinutes = '0'] = String(baseTime || '00:00').split(':');
  return (Number(hours) * 60 + Number(minutes)) - (Number(baseHours) * 60 + Number(baseMinutes));
};

export const buildRowLabel = (index = 0) => String.fromCharCode(65 + (index % 26));

export const normalizeSeatCategoryPricingInput = (value = {}) => {
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }

  if (Array.isArray(value)) {
    return Object.fromEntries(
      value
        .map((item) => [String(item?.name || '').trim(), Number(item?.price || 0)])
        .filter(([name]) => Boolean(name))
    );
  }

  return Object.fromEntries(
    Object.entries(value || {}).map(([key, price]) => [String(key).trim(), Number(price || 0)])
  );
};

export const getCategoryEntries = (value = {}, fallbackBasePrice = 250) => {
  const normalizedInput = normalizeSeatCategoryPricingInput(value);
  const entries = Object.entries(normalizedInput)
    .map(([name, price], index) => ({
      name: String(name || '').trim(),
      price: Number(price || fallbackBasePrice),
      index
    }))
    .filter((item) => item.name);

  return entries.length
    ? entries
    : [{ name: 'Standard', price: Number(fallbackBasePrice || 250), index: 0 }];
};

export const normalizeSeatCategoryPricing = (value = {}, fallbackBasePrice = 250) =>
  Object.fromEntries(
    getCategoryEntries(value, fallbackBasePrice).map((item) => [item.name, Number(item.price || fallbackBasePrice)])
  );

export const normalizeShowSlotPricing = (value = {}) => ({
  morning: Number(value?.morning ?? DEFAULT_SHOW_SLOT_PRICING.morning),
  afternoon: Number(value?.afternoon ?? DEFAULT_SHOW_SLOT_PRICING.afternoon),
  night: Number(value?.night ?? DEFAULT_SHOW_SLOT_PRICING.night)
});

export const getShowSlotLabel = (time = '00:00') => {
  const [hours = '0'] = String(time).split(':');
  const hour = Number(hours);
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'night';
};

export const buildShowRowCategories = (rows = 0, seatCategoryPricing = {}, fallbackBasePrice = 250) => {
  const totalRows = Math.max(Number(rows || 0), 0);
  if (!totalRows) return [];

  const entries = getCategoryEntries(seatCategoryPricing, fallbackBasePrice).slice(0, 7);
  if (entries.length === 1) {
    return Array.from({ length: totalRows }).map((_, rowIndex) => ({
      rowLabel: buildRowLabel(rowIndex),
      category: entries[0].name
    }));
  }

  const sortedEntries = [...entries].sort((left, right) => {
    if (left.price !== right.price) return left.price - right.price;
    return left.index - right.index;
  });

  const highestCategory = sortedEntries[sortedEntries.length - 1];
  const remainingCategories = sortedEntries.slice(0, -1).reverse();
  const remainingRows = Math.max(totalRows - 1, 0);
  const baseRowsPerCategory = remainingCategories.length
    ? Math.floor(remainingRows / remainingCategories.length)
    : 0;
  const extraRows = remainingCategories.length
    ? remainingRows % remainingCategories.length
    : 0;
  const assignedCategories = [];

  remainingCategories.forEach((category, index) => {
    const allocatedRows = baseRowsPerCategory + (index >= Math.max(remainingCategories.length - extraRows, 0) ? 1 : 0);
    for (let count = 0; count < allocatedRows; count += 1) {
      assignedCategories.push(category.name);
    }
  });

  while (assignedCategories.length < remainingRows) {
    assignedCategories.push(remainingCategories[remainingCategories.length - 1]?.name || highestCategory.name);
  }

  assignedCategories.unshift(highestCategory.name);

  return assignedCategories.slice(0, totalRows).map((category, rowIndex) => ({
    rowLabel: buildRowLabel(rowIndex),
    category
  }));
};

export const calculateCharges = (ticketPrice, quantity, subtotalOverride) => {
  const subtotal =
    typeof subtotalOverride === 'number'
      ? subtotalOverride
      : ticketPrice * quantity;
  const adminCommission = Math.round(subtotal * 0.05);
  const gatewayCharge = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + adminCommission + gatewayCharge;
  const organizerPayout = subtotal - Math.round(subtotal * 0.15);

  return {
    subtotal,
    adminCommission,
    gatewayCharge,
    totalAmount,
    organizerPayout
  };
};
