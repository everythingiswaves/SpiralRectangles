let cnv;
let boxes = [];
let drawQueue = [];
let drawIndex = 0;
const maxTries = 5000;

function setup() {
  cnv = createCanvas(800, 800);
  cnv.parent('canvas-holder');
  frameRate(60);

  // wire up buttons
  select('#randomizeBtn').mousePressed(randomize);
  select('#restartBtn').mousePressed(restart);
  select('#saveBtn').mousePressed(() => saveCanvas(cnv, 'spirals', 'png'));

  // ensure step≥stroke
  select('#strokeWeightInput').input(updateStepMin);

  restart();  // initial draw
}

function draw() {
  if (drawIndex < drawQueue.length) {
    let s = drawQueue[drawIndex++];
    stroke(s.col);
    line(s.x1, s.y1, s.x2, s.y2);
  }
}

function restart() {
  // read UI
  let bg = select('#bgColor').value();
  let sw = int(select('#strokeWeightInput').value());
  let step = int(select('#stepSizeInput').value());

  // enforce step ≥ stroke
  if (step < sw) {
    step = sw;
    select('#stepSizeInput').value(step);
  }

  // apply
  strokeWeight(sw);
  background(bg);

  // reset queues
  boxes = [];
  drawQueue = [];
  drawIndex = 0;

  packSpirals(step, sw);
}

// when strokeWeight changes, bump step slider min
function updateStepMin() {
  let sw = int(this.value());
  let stepSlider = select('#stepSizeInput').elt;
  stepSlider.min = sw;
  if (int(stepSlider.value) < sw) {
    stepSlider.value = sw;
  }
}

function randomize() {
  // random dark bg
  let g = floor(random(0, 50));
  select('#bgColor').value('#' + hexColor(g, g, g));

  // random colors...
  selectAll('.colorInput').forEach(inp => {
    let r = floor(random(50, 255)),
        g = floor(random(50, 255)),
        b = floor(random(50, 255));
    inp.value('#' + hexColor(r, g, b));
  });

  // numeric: around your defaults (tamer)
  let sw = floor(random(2, 8));
  select('#strokeWeightInput').value(sw);

  let step = floor(random(sw, sw + 10));
  select('#stepSizeInput').elt.min = sw;
  select('#stepSizeInput').value(step);

  select('#spiralCount').value(floor(random(20, 60)));
  select('#minLen').value(floor(random(5, 10)));
  select('#maxLen').value(floor(random(25, 40)));
  select('#padding').value(floor(random(3, 10)));

  restart();
}

// helper to build hex
function hexColor(r, g, b) {
  return [r, g, b]
    .map(v => v.toString(16).padStart(2, '0'))
    .join('');
}

// get palette, packSpirals, generateSpiral, noOverlap unchanged,
// but note packSpirals now takes `step` and `stroke` is read earlier:
function packSpirals(step, sw) {
  let total   = int(select('#spiralCount').value());
  let padding = int(select('#padding').value());
  let minPct  = float(select('#minLen').value()) / 100;
  let maxPct  = float(select('#maxLen').value()) / 100;
  let palette = selectAll('.colorInput').map(i => i.value());

  let placed = 0, tries = 0;
  while (placed < total && tries < total * maxTries) {
    tries++;
    let startVert = random() < 0.5;
    let baseLen   = random(minPct * width, maxPct * width);
    let spirals   = floor(random(2, 7));
    let cx        = random(baseLen, width - baseLen);
    let cy        = random(baseLen, height - baseLen);

    let { segmentsArr, bbox } =
      generateSpiral(cx, cy, baseLen, step, spirals, startVert);

    let inf = {
      xMin: bbox.xMin - padding,
      xMax: bbox.xMax + padding,
      yMin: bbox.yMin - padding,
      yMax: bbox.yMax + padding
    };

    if (
      inf.xMin >= 0 && inf.xMax <= width &&
      inf.yMin >= 0 && inf.yMax <= height &&
      noOverlap(inf)
    ) {
      let col = palette[placed % palette.length];
      segmentsArr.forEach(s => drawQueue.push({ ...s, col }));
      boxes.push(inf);
      placed++;
    }
  }
}

// generateSpiral and noOverlap same as before...
function generateSpiral(cx, cy, baseLen, step, spirals, startVert) {
  let x = cx, y = cy;
  let dir = startVert ? 1 : 0;
  let segmentsArr = [];
  let minX = x, maxX = x, minY = y, maxY = y;
  let totalSeg = spirals * 4;

  for (let i = 0; i < totalSeg; i++) {
    let len = (i%2===0)
            ? baseLen + (i/2)*step
            : ((i+1)/2)*step;

    if (
      i === totalSeg-1 &&
      ((!startVert && dir===3) || (startVert && dir===0))
    ) {
      len -= step;
    }

    let nx = x + (dir===0?len:dir===2?-len:0);
    let ny = y + (dir===3?len:dir===1?-len:0);

    segmentsArr.push({ x1:x,y1:y,x2:nx,y2:ny });
    minX = min(minX, nx); maxX = max(maxX, nx);
    minY = min(minY, ny); maxY = max(maxY, ny);

    x = nx; y = ny;
    dir = (dir+1)%4;
  }
  return {
    segmentsArr,
    bbox: { xMin:minX, xMax:maxX, yMin:minY, yMax:maxY }
  };
}

function noOverlap(bb) {
  return !boxes.some(o =>
    bb.xMax >= o.xMin &&
    bb.xMin <= o.xMax &&
    bb.yMax >= o.yMin &&
    bb.yMin <= o.yMax
  );
}
