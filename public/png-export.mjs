// Export chart as PNG
export function exportChartAsPNG() {
    const svgNode = document.getElementById("chart");
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgNode);
    const image = new Image();

    // Include styles for correct rendering
    const style = `
		    <style>
			.hill-path {
			    fill: none; /* No fill */
			    stroke: black; /* Stroke color */
			    stroke-width: 2; /* Stroke width */
			}
			text {
			    font-family: sans-serif;
			    font-size: 12px;
			}
		    </style>
		`;

    // Insert styles directly into the SVG source
    const svgWithStyles = svgString.replace(/<\/svg>/, `${style}</svg>`);

    image.src = "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(svgWithStyles)));
    image.onload = function () {
        const canvas = document.createElement("canvas");
        const scaleFactor = 4;
        canvas.width = svgNode.clientWidth * scaleFactor;
        canvas.height = svgNode.clientHeight * scaleFactor;

        const context = canvas.getContext("2d");
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.imageSmoothingEnabled = true; // Enable image smoothing
        context.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0); // Use setTransform for scaling
        context.drawImage(image, 0, 0);

        const png = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = png;
        a.download = "hillchart.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
}