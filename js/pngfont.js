/** png-font.js
 * MIT License
 *
 * Copyright (c) 2016 Érico Vieira Porto, stsyn
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

// eslint-disable-next-line no-unused-vars
const png_font = {
  textDrawn: [],
  textUTF8Array: [],
  fontUrl: null,
  charWidth: 8,
  charHeight: 8,
  ANSICharWidth: 8,
  charsInRow: 256,
  charMap: null,

  /** to start the png_font writer
   * png_font.setup must be ran before any write to the canvas, passing a valid
   * canvas context with size bigger then zero, and a valid path for the image.
   * when the image is loaded, it emits 'png_font_loaded' event and calls the
   * callback function.
   */
  setup: function (drawingContext,
                   fontImageUrl,
                   callback,
                   charWidth = 16,
                   ANSICharWidth = 8,
                   charHeight = 16,
                   charsInRow = 256,
                   charMap) {
    if (typeof callback === 'undefined') {
      callback = function () {};
    }
    this.charWidth = charWidth;
    this.charHeight = charHeight;
    this.ANSICharWidth = ANSICharWidth;
    this.charsInRow = charsInRow;
    this.charMap = charMap;
    this.ctx = drawingContext;

    this.fontImage = new Image();
    this.fontImage.onload = function () {
      const event = new Event('png_font_loaded');
      document.dispatchEvent(event);
      callback();
    };
    if (typeof fontImageUrl === 'undefined' || fontImageUrl === null) {
      fontImageUrl = 'img/unifont.png';
    }
    this.fontImage.src = fontImageUrl;
  },

  // to convert str with possible unicode to array of unicode chars
  toCharCodeArray: function (str) {
    return Array.from(str).map(i => i.charCodeAt(0));
  },

  // Where each character width information is taken from.
  // It's working for unifont.png as is, but code seems a bit hacky.
  getCharWidthFromCharCode: function (chr) {
    let charWidth = this.charWidth;
    if (chr < 32 * 256) {
      charWidth = this.ANSICharWidth;
    }
    return charWidth;
  },

  getTextWidth: function (text, size) {
    if (typeof size === 'undefined') {
      size = 1;
    }
    let textWidth = 0;
    const charCodeArray = this.toCharCodeArray(text);
    for (let i = 0; i < charCodeArray.length; i++) {
      textWidth += this.getCharWidthFromCharCode(charCodeArray[i]);
    }
    return textWidth * size;
  },

  // get text/char height when needed.
  getHeight: function (size) {
    return size * this.charHeight;
  },

  getCharPosition: function(charCode) {
    let index;
    const chr = String.fromCharCode(charCode);
    if (this.charMap) {
      index = this.charMap.indexOf(chr);
    } else {
      index = charCode;
    }
    if (index === -1) {
      return [0, 0];
    }
    return [Math.floor(this.charWidth * (index % this.charsInRow)), this.charHeight * Math.floor(index / this.charsInRow)];
  },

  // function to draw a single char
  drawChr: function (ctx, img, chr, pos) {
    let xchar, ychar;
    [xchar, ychar] = this.getCharPosition(chr);
    const charWidth = this.getCharWidthFromCharCode(chr);

    ctx.drawImage(img,
      xchar, ychar,
      this.charWidth, this.charHeight,
      pos[0], pos[1],
      this.charWidth, this.charHeight);
    return charWidth;
  },

  // creates pixel art friendly canvas and return it
  //  it's going to be used to create intermediate buffers
  createBufferCanvas: function (width, height) {
    const buffer = document.createElement('canvas');
    buffer.style['image-rendering'] = 'pixelated';
    buffer.width = width;
    buffer.height = height;
    const bx = buffer.getContext('2d');
    bx.mozImageSmoothingEnabled = false;
    // bx.webkitImageSmoothingEnabled = false;
    bx.imageSmoothingEnabled = false;
    return buffer;
  },

  // function to draw text in a canvas.
  // the user should access drawText as entry point though
  drawTextCanvas: function (ctx, utf8Array, pos, color, size) {
    const width = this.charWidth * utf8Array.length;
    const height = this.charHeight;
    const buffer = this.createBufferCanvas(width, height);
    const bx = buffer.getContext('2d');
    let charWidth = 0;
    let charTotalWidth = 0;

    const chrPos = [0, 0];
    for (let i = 0; i < utf8Array.length; i++) {
      const char = utf8Array[i];
      charWidth = this.drawChr(bx, this.fontImage, char, chrPos);
      chrPos[0] += charWidth;
      charTotalWidth += charWidth;
    }

    if (typeof color !== 'undefined' || color !== null) {
      bx.fillStyle = color;
      bx.globalCompositeOperation = 'source-in';
      bx.fillRect(0, 0, width, height);
    }

    // this will resize the image if needed by using an intermediate buffer
    if (typeof size === 'undefined' || size === null || size === 1) {
      ctx.drawImage(buffer, pos[0], pos[1]);
    } else {
      const bufferSize = this.createBufferCanvas(width * size, height * size);
      const bSx = bufferSize.getContext('2d');

      bSx.drawImage(buffer, 0, 0, width * size, height * size);
      ctx.drawImage(bufferSize, pos[0], pos[1]);
    }
    return charTotalWidth;
  },

  // allows drawing text with shadows
  drawTextShadow: function (utf8Array, color, size, shadowcolor) {
    if (typeof size === 'undefined' || size === null) {
      size = 1;
    }
    const width = this.charWidth * utf8Array.length * size;
    const height = this.charHeight * size;
    const buffer = this.createBufferCanvas(width + 1, height + 1);
    const bx = buffer.getContext('2d');
    this.drawTextCanvas(bx, utf8Array, [size, size], shadowcolor, size);
    const charTotalWidth = this.drawTextCanvas(bx, utf8Array, [0, 0], color, size);
    return [buffer, charTotalWidth + size];
  },

  // temporary fix for disabling word wrapping but account new lines.
  getWrapFromText: function (text, size, pos) {
    const lines = text.split(/\r|\r\n|\n/);
    const linesCount = lines.length;
    let longestLine = 0;
    for (let i = 0; i < linesCount; i++) {
      if (lines[i].length > longestLine) longestLine = lines[i].length;
    }
    return [(longestLine * size * this.charWidth) + pos[0], (linesCount * size * this.charWidth) + pos[1], 0];
  },

  // simple word wrapping
  wrapText: function (text, wrap, size) {
    if (this.textDrawn !== text) {
      this.textUTF8Array = this.toCharCodeArray(text);
      this.textDrawn = text;
    }

    function missingText (text, utf82DArray) {
      let flatUtf8Array = [];
      for (let i = 0; i < utf82DArray.length; i++) {
        flatUtf8Array = flatUtf8Array.concat(utf82DArray[i]);
      }
      const doneText = String.fromCharCode.apply(null, flatUtf8Array);

      return text.substring(doneText.length);
    }

    const wrapped2DArray = [];
    let missing = '';
    let width = 0;
    let line = 0;
    let word = [];
    let wordWidth = 0;
    wrapped2DArray[line] = [];
    const spaceWidth = 8 * size;

    let maxWidth = 0;
    for (let i = 0; i <= this.textUTF8Array.length; i++) {
      if (this.textUTF8Array[i] !== 32 &&
        i !== this.textUTF8Array.length &&
        this.textUTF8Array[i] !== 10) {
        // if it isn't a space, end or linefeed
        wordWidth = wordWidth + this.getCharWidthFromCharCode(this.textUTF8Array[i]) * size;
        word.push(this.textUTF8Array[i]);
      } else {
        // if it is
        if (width + wordWidth < wrap[0]) {
          // is it smaller then right wrap area?
          // it is, so add the word to line
          wrapped2DArray[line] = wrapped2DArray[line].concat(word).concat([32]);
          width = width + wordWidth + spaceWidth;

          if (this.textUTF8Array[i] === 10) {
            // this code block advances a line!
            line++;
            if (line * 16 * size >= wrap[1]) { // has it reached the bottom of wrap area?
              missing = missingText(text, wrapped2DArray);
              return [wrapped2DArray, missing];
            }
            wrapped2DArray.push([]); // let's advance to next line!

            width = wordWidth + spaceWidth;
            wrapped2DArray[line] = [];
            // end of line advance code block
          }

          wordWidth = 0; // let's start a new word
          word = [];
        } else { // it's not smaller, so we will go back...
          // this code block advances a line!
          line++;
          if ((line + 1) * this.charWidth * size >= wrap[1]) { // has it reached the bottom of wrap area?
            missing = missingText(text, wrapped2DArray);
            return [wrapped2DArray, missing];
          }
          wrapped2DArray.push([]); // let's advance to next line!

          width = wordWidth + spaceWidth;
          wrapped2DArray[line] = [];
          // end of line advance code block

          wrapped2DArray[line] = wrapped2DArray[line].concat(word).concat([32]);
          wordWidth = 0; // let's start a new word
          word = [];
        }
      }

      // stores the maximum width
      if (width > maxWidth) {
        maxWidth = width;
      }
    }

    return [wrapped2DArray, missing, maxWidth, (line + 1) * this.getHeight(size)];
  },
  /** How to draw texts in a canvas
   *
   * examples:
   *
   * png_font.drawText("hello world!",[32,32])
   * png_font.drawText("한국어!",[48,64],"#559")
   * png_font.drawText("hello world!",[4,4],'blue',2,'red')
   */
  drawText: function (text, pos, color, size, shadow, wrap, tightenCanvas) {
    // I will define the defaults for each parameter
    // The color default is the natural png color, unifont.png is #000000
    if (typeof size === 'undefined' || size === null) {
      size = 1;
    }
    if (typeof shadow === 'undefined' || shadow === null) {
      shadow = false;
    }
    if (typeof wrap === 'undefined' || wrap === null) {
      wrap = [this.ctx.canvas.width - pos[0], this.ctx.canvas.height - pos[1], 0];
    } else if (wrap === 'nowrap' || !wrap) {
      wrap = this.getWrapFromText(text, size, pos);
    }
    if (typeof tightenCanvas === 'undefined' || tightenCanvas === null) {
      tightenCanvas = false;
    }

    let wrapped2DArray;
    let missing;
    let minWidth;
    let minHeight;

    [wrapped2DArray, missing, minWidth, minHeight] = this.wrapText(text, wrap, size);

    // should resize the canvas to smallest size as possible
    if (tightenCanvas) {
      if (shadow) {
        // I am adding size below to account for the shadow when present
        this.ctx.canvas.width = minWidth + size * 2;
        this.ctx.width = minWidth + size * 2;
        this.ctx.canvas.height = minHeight + size * 2;
        this.ctx.height = minHeight + size * 2;
      } else {
        this.ctx.canvas.width = minWidth;
        this.ctx.width = minWidth;
        this.ctx.canvas.height = minHeight;
        this.ctx.height = minHeight;
      }
    }

    for (let i = 0; i < wrapped2DArray.length; i++) {
      const textUTF8Array = wrapped2DArray[i];

      if (!shadow) {
        this.drawTextCanvas(this.ctx, textUTF8Array, [pos[0], pos[1] + i * 16 * size], color, size);
      } else {
        let buffer;
        buffer = this.drawTextShadow(textUTF8Array, color, size, shadow)[0];
        this.ctx.drawImage(buffer, pos[0], pos[1] + i * this.getHeight(size));
      }
    }

    return missing;
  }
};
