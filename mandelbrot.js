/*
 Copyright (c) 2016 Dilshan R Jayakody. [jayakody2000lk@gmail.com]

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
 rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions
 of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 -----------------------------------------------------------------------------------------------------------------------

 This application is based on Mandel version 1.00 written by Kostas Symeonidis and his students. Most of the code in
 this project are converted from Delphi source code supplied with  Mandel version 1.00.

 Mandel 1.00 is available to download at http://www.cylog.org (or at http://www.cylog.gr).
 */

// Main output canvas related variables.
var outputCanvas = null;
var outputContext = null;
var outputBuffer = null;
var outputViewport = null;

// Color palette related variables.
var colorSelectCanvas = null;
var colorSelectContext = null;
var colorSelectViewport = null;

var defaultControlColors = [0x200000, 0xFFFFFF, 0xFF0000, 0xFFFF40, 0x2020FF];
var controlColors = null;
var colors = null;
var colorSelectorIndex = 0;

var isMouseDown = false;
var mouseX, mouseY;

const MAX_CONTROL_COLORS = 5;
const OUTPUT_CANVAS_SIZE = 360;

/**
 * Reset UI elements to mandelbrot set defaults.
 */
function resetMandel() {
    document.getElementById("colorLevels").value = "256";
    document.getElementById("qMin").value = "-1.5";
    document.getElementById("qMax").value = "1.5";
    document.getElementById("pMin").value = "-2.25";
    document.getElementById("pMax").value = "0.75";
}

/**
 * Reset UI elements to julia set defaults.
 */
function resetJulia() {
    document.getElementById("qMin").value = "-1.8";
    document.getElementById("qMax").value = "1.8";
    document.getElementById("pMin").value = "-1.8";
    document.getElementById("pMax").value = "1.8";
}

/**
 * Function to initialize the mandelbrot generator system and UI elements.
 */
function initPage() {
    document.getElementById("jRec").value = "0.36";
    document.getElementById("jLimit").value = "-0.6583";
    document.getElementById("iterLimit").value = "10";
    document.getElementById("fractalMandal").checked = true;
    resetMandel();

    colorSelectCanvas = document.getElementById("colorSelector");
    colorSelectContext = colorSelectCanvas.getContext("2d");
    colorSelectCanvas.onmouseup = onColorPaletteClick;
    colorSelectViewport = colorSelectCanvas.getBoundingClientRect();

    outputCanvas = document.getElementById("outCanvas");
    outputContext = outputCanvas.getContext("2d");
    outputBuffer = outputContext.createImageData(OUTPUT_CANVAS_SIZE, OUTPUT_CANVAS_SIZE);
    outputViewport = outputCanvas.getBoundingClientRect();

    outputCanvas.onmousedown = onViewportMouseDown;
    outputCanvas.onmousemove = onViewportMouseMove;
    outputCanvas.onmouseup = onViewportMouseUp;

    controlColors = defaultControlColors.slice();
    colors = new Array(2048);
    generateColorMap();

    generateColorSelectorPanel();
}

/**
 * Create color value based on specified red, green and blue components.
 * @param {Number} rComp Red color component.
 * @param {Number} gComp Green color component.
 * @param {Number} bComp Blue color component.
 */
function createColor(rComp, gComp, bComp) {
    return rComp + (gComp << 8) + (bComp << 16);
}

/**
 * Paint specified pixel in output canvas.
 * @param {Number} xLoc X location in output canvas.
 * @param {Number} yLox Y location in output canvas.
 * @param {Number} colorData RGB color data.
 */
function setPixel(xLoc, yLox, colorData) {
    var dataPos = ((OUTPUT_CANVAS_SIZE * yLox) + xLoc) * 4;

    outputBuffer.data[dataPos] = (colorData & 0xFF);
    outputBuffer.data[dataPos + 1] = (colorData & 0xFF00) >> 8;
    outputBuffer.data[dataPos + 2] = (colorData & 0xFF0000) >> 16;
    outputBuffer.data[dataPos + 3] = 0xFF;
}

/**
 * Generate color map based on control colors.
 */
function generateColorMap() {
    var arrayPos, mainArrayPos;
    var red1, green1, blue1, red2, green2, blue2, rStep, gStep, bStep;

    colors[0] = 0;
    for (arrayPos = 1; arrayPos < MAX_CONTROL_COLORS; arrayPos++) {
        blue1 = (controlColors[arrayPos - 1] & 0xFF0000) >> 16;
        green1 = (controlColors[arrayPos - 1] & 0xFF00) >> 8;
        red1 = (controlColors[arrayPos - 1] & 0xFF);

        blue2 = (controlColors[arrayPos] & 0xFF0000) >> 16;
        green2 = (controlColors[arrayPos] & 0xFF00) >> 8;
        red2 = (controlColors[arrayPos] & 0xFF);

        rStep = (red2 - red1) / 63;
        gStep = (green2 - green1) / 63;
        bStep = (blue2 - blue1) / 63;

        for (mainArrayPos = 1; mainArrayPos <= 64; mainArrayPos++) {
            colors [mainArrayPos + (arrayPos - 1) * 64] = createColor(Math.round(red1 + rStep * (mainArrayPos - 1)), Math.round(green1 + gStep * (mainArrayPos - 1)), Math.round(blue1 + bStep * ( mainArrayPos - 1)));
        }
    }

    for (arrayPos = 257; arrayPos <= 2048; arrayPos++) {
        colors[arrayPos] = colors[arrayPos - 256];
    }
}

/**
 * Function to execute mandelbrot or julia set routine based on UI selections.
 */
function runFractal() {
    outputContext.clearRect(0, 0, outputCanvas.width, outputCanvas.height);

    if (document.getElementById("fractalMandal").checked)
        generateMandel();
    else
        generateJulia();
}

/**
 * Generate julia set output on canvas with specified values in UI.
 */
function generateJulia() {
    var colorId, x0, y0, iterCount, round, x, y;

    var kMax = parseInt(document.getElementById("colorLevels").value);
    var iterLimit = parseInt(document.getElementById("iterLimit").value);
    var qMax = parseFloat(document.getElementById("qMax").value);
    var qMin = parseFloat(document.getElementById("qMin").value);
    var pMax = parseFloat(document.getElementById("pMax").value);
    var pMin = parseFloat(document.getElementById("pMin").value);
    var jRe = parseFloat(document.getElementById("jRec").value);
    var jLm = parseFloat(document.getElementById("jLimit").value);

    var xStep = (pMax - pMin) / OUTPUT_CANVAS_SIZE;
    var yStep = (qMax - qMin) / OUTPUT_CANVAS_SIZE;

    var limit = 359;
    if (qMin == (-1 * qMax)) {
        limit = 180;
    }

    for (var sX = 0; sX <= 359; sX++) {
        for (var sY = 0; sY <= limit; sY++) {
            colorId = 0;
            x0 = pMin + xStep * sX;
            y0 = qMax - yStep * sY;
            do {
                x = x0 * x0 - y0 * y0 + jRe;
                y = 2 * x0 * y0 + jLm;
                x0 = x;
                y0 = y;
                colorId++;
                round = (x * x) + (y * y);
            }
            while (!((round > iterLimit) || (colorId == kMax)));

            if (colorId == kMax) {
                colorId = 0;
            }

            setPixel(sX, sY, colors[colorId]);

            if ((limit == 180) && (sY != limit) && (sY != 0))
                setPixel(sX, (OUTPUT_CANVAS_SIZE - sY), colors[colorId]);
        }

    }

    outputContext.putImageData(outputBuffer, (outputCanvas.width - OUTPUT_CANVAS_SIZE) / 2, 0);
}

/**
 * Generate mandelbrot output on canvas with specified values in UI.
 */
function generateMandel() {
    var colorId, x0, y0, iterCount, round, x, y;

    var kMax = parseInt(document.getElementById("colorLevels").value);
    var iterLimit = parseInt(document.getElementById("iterLimit").value);
    var qMax = parseFloat(document.getElementById("qMax").value);
    var qMin = parseFloat(document.getElementById("qMin").value);
    var pMax = parseFloat(document.getElementById("pMax").value);
    var pMin = parseFloat(document.getElementById("pMin").value);

    var xStep = (pMax - pMin) / OUTPUT_CANVAS_SIZE;
    var yStep = (qMax - qMin) / OUTPUT_CANVAS_SIZE;

    var limit = 359;
    if (qMin == (-1 * qMax)) {
        limit = 180;
    }

    for (var sX = 0; sX <= 359; sX++) {
        for (var sY = 0; sY <= limit; sY++) {
            colorId = 0;
            x0 = 0;
            y0 = 0;

            do {
                x = x0 * x0 - y0 * y0 + pMin + (xStep * sX);
                y = 2 * x0 * y0 + qMax - (yStep * sY);
                x0 = x;
                y0 = y;
                colorId++;
                round = (x * x) + (y * y);
            }
            while (!((round > iterLimit) || (colorId == kMax)));

            if (colorId == kMax) {
                colorId = 0;
            }

            setPixel(sX, sY, colors[colorId]);

            if ((limit == 180) && (sY != limit) && (sY != 0))
                setPixel(sX, (OUTPUT_CANVAS_SIZE - sY), colors[colorId]);
        }
    }

    outputContext.putImageData(outputBuffer, (outputCanvas.width - OUTPUT_CANVAS_SIZE) / 2, 0);
}

/**
 * Convert specified color value to rgb() color string.
 * @param {Number} inColor Color value to convert.
 * @returns {String} Converted rgb() color string.
 */
function colorToWebColor(inColor) {
    return "rgb(" + (inColor & 0xFF) + ", " + ((inColor & 0xFF00) >> 8) + "," + ((inColor & 0xFF0000) >> 16) + ")";
}

/**
 * Generate gradient color panel for color selector.
 */
function generateColorSelectorPanel() {
    var kMax = parseInt(document.getElementById("colorLevels").value);
    var currentColor;
    colorSelectContext.lineWidth = 1;

    for (var colorPos = 0; colorPos < colorSelectCanvas.width; colorPos++) {
        currentColor = colors[Math.round(kMax * colorPos / colorSelectCanvas.width)];
        colorSelectContext.strokeStyle = colorToWebColor(currentColor);
        colorSelectContext.beginPath();
        colorSelectContext.moveTo(colorPos, 0);
        colorSelectContext.lineTo(colorPos, colorSelectCanvas.height);
        colorSelectContext.stroke();
    }
}

/**
 * Generate random color palette and update UI.
 */
function generateRandomControlPalette() {
    function getRandomColorComponent() {
        return Math.floor(Math.random() * 256);
    }

    for (var controlPos = 0; controlPos < MAX_CONTROL_COLORS; controlPos++) {
        controlColors[controlPos] = createColor(getRandomColorComponent(), getRandomColorComponent(), getRandomColorComponent());
    }

    generateColorMap();
    generateColorSelectorPanel();
}

/**
 * Reset game color palette to default color palette.
 */
function resetColorPalette() {
    controlColors = defaultControlColors.slice();
    generateColorMap();
    generateColorSelectorPanel();
}

/**
 * Handle jscolor color selection / change events.
 * @param {Object} clrData Color data received from jscolor component.
 */
function colorSelection(clrData) {
    if ((colorSelectorIndex >= 0) && (colorSelectorIndex < 5)) {
        controlColors[colorSelectorIndex] = createColor(clrData.rgb[0], clrData.rgb[1], clrData.rgb[2]);
        generateColorMap();
        generateColorSelectorPanel();
    }
}

/**
 * Mouse up event handler for color palette. This event is used to raise the color selection window to UI.
 * @param {Object} eventData Class with mouse coordinates and other related information.
 */
function onColorPaletteClick(eventData) {
    if ((eventData.clientX >= 0) && (eventData.clientY >= 0)) {
        colorSelectorIndex = Math.round((eventData.clientX - colorSelectViewport.left) / colorSelectCanvas.width * 4);
        document.getElementById('jscolorHost').jscolor.show();
    }
}

/**
 * Mouse down event handler for main output canvas.
 * @param {Object} eventData Class with mouse coordinates and other related information.
 */
function onViewportMouseDown(eventData) {
    isMouseDown = true;
    mouseX = (eventData.clientX - outputViewport.left);
    mouseY = (eventData.clientY - outputViewport.top);

    outputContext.fillStyle = 'rgba(255, 0, 0, 0.5)';
    outputContext.lineWidth = 2;
    outputContext.strokeStyle = 'white';
}

/**
 * Mouse move event handler for main output canvas.
 * @param {Object} eventData Class with mouse coordinates and other related information.
 */
function onViewportMouseMove(eventData) {
    var xPos, yPos;

    if ((isMouseDown) && (outputBuffer != null)) {
        outputContext.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
        outputContext.putImageData(outputBuffer, (outputCanvas.width - OUTPUT_CANVAS_SIZE) / 2, 0);

        xPos = (eventData.clientX - outputViewport.left);
        yPos = (eventData.clientY - outputViewport.top);

        var correctedY = mouseY + (((yPos > mouseY) ? 1 : 0) * 2 - 1) * Math.round(OUTPUT_CANVAS_SIZE * Math.abs(xPos - mouseX) / OUTPUT_CANVAS_SIZE);

        var width = xPos - mouseX;
        var height = correctedY - mouseY;

        outputContext.beginPath();
        outputContext.rect(mouseX, mouseY, width, height);
        outputContext.fill();
        outputContext.stroke();
    }
}

/**
 * Mouse up event handler for main output canvas.
 * @param {Object} eventData Class with mouse coordinates and other related information.
 */
function onViewportMouseUp(eventData) {
    var xPos, yPos, correctedX, correctedY, temp, pDiff, qDiff;

    if (isMouseDown) {
        xPos = (eventData.clientX - outputViewport.left);
        yPos = (eventData.clientY - outputViewport.top);

        var qMax = parseFloat(document.getElementById("qMax").value);
        var qMin = parseFloat(document.getElementById("qMin").value);
        var pMax = parseFloat(document.getElementById("pMax").value);
        var pMin = parseFloat(document.getElementById("pMin").value);

        isMouseDown = false;

        if (Math.abs(xPos - mouseX) <= 2) {
            return;
        }

        correctedX = xPos;
        correctedY = mouseY + (((yPos > mouseY) ? 1 : 0) * 2 - 1) * Math.round(OUTPUT_CANVAS_SIZE * Math.abs(xPos - mouseX) / OUTPUT_CANVAS_SIZE);

        if (correctedX < mouseX) {
            temp = correctedX;
            correctedX = mouseX;
            mouseX = temp;
        }

        if (correctedY < mouseY) {
            temp = correctedY;
            correctedY = mouseY;
            mouseY = temp;
        }

        pDiff = pMax - pMin;
        pMin = pMin + mouseX * pDiff / OUTPUT_CANVAS_SIZE;
        pMax = pMax - (OUTPUT_CANVAS_SIZE - correctedX) * pDiff / OUTPUT_CANVAS_SIZE;

        qDiff = qMax - qMin;
        qMin = qMin + (OUTPUT_CANVAS_SIZE - correctedY) * qDiff / OUTPUT_CANVAS_SIZE;
        qMax = qMax - mouseY * qDiff / OUTPUT_CANVAS_SIZE;

        document.getElementById("qMax").value = qMax;
        document.getElementById("qMin").value = qMin;
        document.getElementById("pMax").value = pMax;
        document.getElementById("pMin").value = pMin;
        runFractal();
    }
}

/**
 * Function to export main canvas data to (PNG) image file.
 */
function exportCanvasData() {
    if (outputBuffer != null) {
        var dataUrl = outputCanvas.toDataURL();
        window.open(dataUrl);
    }
}

/**
 * Function to reset all page parameters to defaults.
 */
function resetAll() {
    document.getElementById("fractalMandal").checked = true;
    resetMandel();
    resetColorPalette();
    runFractal();
}