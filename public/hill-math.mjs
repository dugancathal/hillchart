// const amplitude = 150; // Amplitude: the peak deviation of the function from its central value
// const period = 1200; // Period: the length of one complete cycle of the sine wave
// const phaseShift = 300; // Phase Shift: horizontal shift of the sine wave
// const verticalShift = 200; // Vertical Shift: vertical displacement of the sine wave

export const buildHillConfig = (screen) => {
  const width = screen.width * 0.9 > 800 ? 1200 : screen.width * 0.9;
  const height = width / 3;

  const phaseShift = width / 4;
  const verticalShift = height / 2;
  const amplitude = height / 2.5;
  const period = width;
  const B = (2 * Math.PI) / period;
  const xMin = 20;
  const xMax = width - xMin;
  return ({
    xMin,
    xMax,
    xMid: (xMin + xMax) / 2,

    width,
    height,
    amplitude,
    verticalShift,
    phaseShift,
    period,
    yOf: (x) => amplitude * Math.sin(B * (x + phaseShift)) + verticalShift,
  });
}

