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
