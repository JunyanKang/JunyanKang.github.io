type Anchor = { id: number; x: number; y: number; name: string };
type Label = Anchor & { left: number; top: number; width: number; text: string };

export function drawAnnotationLabels(ctx: CanvasRenderingContext2D, anchors: Anchor[],
  width: number, height: number, zoom: number): number[] {
  const font = Math.min(15, 11 + Math.log2(zoom));
  const line = Math.ceil(font + 5);
  ctx.font = `600 ${font}px sans-serif`;
  function arrange(numbered: boolean) {
    const placed: Label[] = [];
    for (const anchor of anchors) {
      const text = numbered ? String(anchor.id + 1) : anchor.name;
      const box = Math.ceil(ctx.measureText(text).width + 6);
      let best: Label | undefined;
      let distance = Infinity;
      for (let top = 1; top + line <= height; top += line + 1) {
        for (let left = 1; left + box <= width; left += numbered ? box + 2 : 6) {
          const dx = left + box / 2 - anchor.x;
          const dy = top + line / 2 - anchor.y;
          const cost = dx * dx + dy * dy;
          if (cost >= distance || placed.some(p => p.top === top && left < p.left + p.width + 1 && left + box + 1 > p.left)) continue;
          best = { ...anchor, text, left, top, width: box };
          distance = cost;
        }
      }
      if (!best) break;
      placed.push(best);
    }
    return placed;
  }
  const numbered = anchors.reduce((sum, a) => sum + (ctx.measureText(a.name).width + 6) * line, 0) > width * height * 0.23;
  let labels = arrange(numbered);
  const useKey = numbered || labels.length !== anchors.length;
  if (useKey && !numbered) labels = arrange(true);
  ctx.strokeStyle = "#40585b";
  for (const label of labels) {
    ctx.beginPath();
    ctx.moveTo(label.x, label.y);
    ctx.lineTo(Math.max(label.left, Math.min(label.left + label.width, label.x)),
      Math.max(label.top, Math.min(label.top + line, label.y)));
    ctx.stroke();
  }
  ctx.textAlign = "left";
  for (const label of labels) {
    ctx.fillStyle = "rgba(250,252,249,.91)";
    ctx.fillRect(label.left, label.top, label.width, line);
    ctx.fillStyle = "#142d30";
    ctx.fillText(label.text, label.left + 3, label.top + font);
  }
  return useKey ? anchors.map(a => a.id) : [];
}
