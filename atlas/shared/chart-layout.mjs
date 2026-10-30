// Reserve readable slots for every category instead of silently skipping labels.
export function categoryLayout(labels, fontSize, preferredWidth, rightPad) {
  const angle = 60;
  const radians = angle * Math.PI / 180;
  const textWidths = labels.map(label => label.length * fontSize * 0.62);
  const slotWidth = Math.max(26, fontSize * 1.6);
  const leftPad = Math.ceil(Math.max(24, (textWidths[0] || 0) * Math.cos(radians) - slotWidth / 2 + 12));
  const bottomPad = Math.ceil(Math.max(134, Math.max(0, ...textWidths) * Math.sin(radians) + fontSize * 4 + 24));
  return {
    angle,
    leftPad,
    bottomPad,
    width: Math.max(preferredWidth, leftPad + rightPad + labels.length * slotWidth),
  };
}

// Keep readable categories in the page flow; never create a horizontal viewport.
export function fitCategoryBlocks(labels, fontSize, preferredWidth, availableWidth, rightPad) {
  const limit = availableWidth || preferredWidth;
  const angle = limit < 620 ? 90 : 60;
  const radians = angle * Math.PI / 180;
  const slotWidth = Math.max(26, fontSize * 1.6);
  const textWidths = labels.map(label => label.length * fontSize * 0.62);
  const leftPad = Math.ceil(Math.max(24, Math.max(0, ...textWidths) * Math.cos(radians) - slotWidth / 2 + 12));
  const width = Math.min(limit, Math.max(preferredWidth, leftPad + rightPad + labels.length * slotWidth));
  const capacity = Math.max(1, Math.floor((width - leftPad - rightPad) / slotWidth));
  const blocks = [];
  for (let start = 0; start < labels.length; start += capacity) blocks.push(labels.slice(start, start + capacity));
  return {
    width: Math.min(limit, Math.max(280, leftPad + rightPad + Math.min(capacity, labels.length) * slotWidth)),
    leftPad, angle, slotWidth, blocks: blocks.length ? blocks : [[]],
    bottomPad: Math.ceil(Math.max(134, Math.max(0, ...textWidths) * Math.sin(radians) + fontSize * 4 + 24))
  };
}
