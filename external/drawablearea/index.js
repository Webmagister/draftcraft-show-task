(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":1,"ieee754":3}],3:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var ArrIterator_1=require("../iterator/ArrIterator");var ActionController=/*#__PURE__*/function(){function ActionController(){_classCallCheck(this,ActionController);this._actions=[];this._currentAction=new ArrIterator_1.ArrIterator(0,this._actions)}_createClass(ActionController,[{key:"execute",value:function execute(action){this._currentAction.insert(action).value().execute();this._currentAction.next().deleteTail()}},{key:"redo",value:function redo(){if(this._currentAction.value()){this._currentAction.value().execute();this._currentAction.next()}}},{key:"undo",value:function undo(){this._currentAction.prev();if(this._currentAction.value()){this._currentAction.value().unexecute()}}},{key:"clean",value:function clean(){this._currentAction=new ArrIterator_1.ArrIterator(0,this._actions);this._currentAction.deleteTail()}}]);return ActionController}();exports.ActionController=ActionController;

},{"../iterator/ArrIterator":47}],5:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var typetools_1=require("../utils/typetools");var framesHandlers=new Set;var FramesController=/*#__PURE__*/function(){function FramesController(){_classCallCheck(this,FramesController)}_createClass(FramesController,null,[{key:"addFrameHandler",value:function addFrameHandler(handler){framesHandlers.add(handler)}},{key:"removeFrameHandler",value:function removeFrameHandler(handler){framesHandlers.delete(handler)}}]);return FramesController}();exports.FramesController=FramesController;var animationFrameCallback=function animationFrameCallback(){var _iteratorNormalCompletion=true;var _didIteratorError=false;var _iteratorError=undefined;try{for(var _iterator=framesHandlers.values()[Symbol.iterator](),_step;!(_iteratorNormalCompletion=(_step=_iterator.next()).done);_iteratorNormalCompletion=true){var handler=_step.value;if(typetools_1.isFunction(handler)){handler=handler;handler()}else{handler=handler;handler.onFrame()}}}catch(err){_didIteratorError=true;_iteratorError=err}finally{try{if(!_iteratorNormalCompletion&&_iterator.return!=null){_iterator.return()}}finally{if(_didIteratorError){throw _iteratorError}}}requestAnimationFrame(animationFrameCallback)};requestAnimationFrame(animationFrameCallback);

},{"../utils/typetools":56}],6:[function(require,module,exports){
(function (Buffer){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var Icons=/*#__PURE__*/function(){function Icons(){_classCallCheck(this,Icons)}_createClass(Icons,null,[{key:"back",value:function back(){return Buffer("PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgICB2aWV3Qm94PSIwIDAgNTEyLjE3MSA1MTIuMTcxIj4KICAgIDxnPgogICAgICAgIDxwYXRoCiAgICAgICAgICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKDUxMikgcm90YXRlKDkwKSIKICAgICAgICAgICAgZmlsbD0iI0ZGRiIKICAgICAgICAgICAgZD0iTTQ3OS4wNDYsMjgzLjkyNWMtMS42NjQtMy45ODktNS41NDctNi41OTItOS44NTYtNi41OTJIMzUyLjMwNVYxMC42NjdDMzUyLjMwNSw0Ljc3OSwzNDcuNTI2LDAsMzQxLjYzOCwwSDE3MC45NzEKICAgICAgICAgICAgYy01Ljg4OCwwLTEwLjY2Nyw0Ljc3OS0xMC42NjcsMTAuNjY3djI2Ni42NjdINDIuOTcxYy00LjMwOSwwLTguMTkyLDIuNjAzLTkuODU2LDYuNTcxYy0xLjY0MywzLjk4OS0wLjc0Nyw4LjU3NiwyLjMwNCwxMS42MjcKICAgICAgICAgICAgbDIxMi44LDIxMy41MDRjMi4wMDUsMi4wMDUsNC43MTUsMy4xMzYsNy41NTIsMy4xMzZzNS41NDctMS4xMzEsNy41NTItMy4xMTVsMjEzLjQxOS0yMTMuNTA0CiAgICAgICAgICAgIEM0NzkuNzkzLDI5Mi41MDEsNDgwLjcxLDI4Ny45MTUsNDc5LjA0NiwyODMuOTI1eiIvPgogICAgPC9nPgo8L3N2Zz4=","base64").toString()}},{key:"star",value:function star(){return Buffer("PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIgogICB2aWV3Qm94PSIwIDAgMjEwIDIyMCIKICAgdmVyc2lvbj0iMS4xIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudAogICAgICAgaWQ9ImxpbmVhckdyYWRpZW50MTQ4MCI+CiAgICAgIDxzdG9wCiAgICAgICAgIHN0eWxlPSJzdG9wLWNvbG9yOiNmZjY2MDA7c3RvcC1vcGFjaXR5OjEiCiAgICAgICAgIG9mZnNldD0iMCIKICAgICAgICAgaWQ9InN0b3AxNDc2IiAvPgogICAgICA8c3RvcAogICAgICAgICBzdHlsZT0ic3RvcC1jb2xvcjojZmZjYzAwO3N0b3Atb3BhY2l0eToxIgogICAgICAgICBvZmZzZXQ9IjEiCiAgICAgICAgIGlkPSJzdG9wMTQ3OCIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8ZmlsdGVyCiAgICAgICBzdHlsZT0iY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzOnNSR0IiCiAgICAgICBpZD0iZmlsdGVyMTQ2NCIKICAgICAgIHg9Ii0wLjE2MDQzOTk4IgogICAgICAgd2lkdGg9IjEuMzIwODgiCiAgICAgICB5PSItMC4xNjYwNTY2NCIKICAgICAgIGhlaWdodD0iMS4zMzIxMTMzIj4KICAgICAgPGZlR2F1c3NpYW5CbHVyCiAgICAgICAgIHN0ZERldmlhdGlvbj0iMi4yNzkxMTI5IgogICAgICAgICBpZD0iZmVHYXVzc2lhbkJsdXIxNDY2IiAvPgogICAgPC9maWx0ZXI+CiAgICA8bGluZWFyR3JhZGllbnQKICAgICAgIHhsaW5rOmhyZWY9IiNsaW5lYXJHcmFkaWVudDE0ODAiCiAgICAgICBpZD0ibGluZWFyR3JhZGllbnQxNDgyIgogICAgICAgeDE9IjMuMDg2MDE2MiIKICAgICAgIHkxPSIyNTguOTE0NDMiCiAgICAgICB4Mj0iMTE1LjkxNjk3IgogICAgICAgeTI9IjEwNS41MDE3MyIKICAgICAgIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIgogICAgICAgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgwLjE3ODY5OTIxLDAsMCwwLjE3NzY1NTA5LDIuMTY5MTU3MSwyLjE5NDMxNzQpIiAvPgogIDwvZGVmcz4KICA8Zz4KICAgIDxwYXRoCiAgICAgICBzdHlsZT0ib3BhY2l0eTowLjE1O2ZpbGw6IzAwMDAwMDtzdHJva2U6I2MzOWIwMDtmaWx0ZXI6dXJsKCNmaWx0ZXIxNDY0KSIKICAgICAgIGlkPSJwYXRoMTQiCiAgICAgICBkPSJNIDMyLjEyNzk3MywzNi40Nzk5MDkgMjEuMjMyNDQzLDMzLjU3MTYxNyAxMS4wNTczNzcsMzcuNTEwODYxIDEwLjQ1NjQyMywyNi4yNDk4ODUgMy41NjU3MDk5LDE3Ljc5MDExNSAxNC4wODk4MywxMy43Mzg3NDEgbCA1LjkxNjM3MiwtOS4xNjc2Njk5IDcuMTA1MjE3LDguNzU3MDg4OSAxMC41NDcyMzIsMi43OTM4MzkgLTYuMTMyODU0LDkuNDYzNTUzIHoiCiAgICAgICB0cmFuc2Zvcm09Im1hdHJpeCg1LjU5NTk5NTYsMCwwLDUuNjI4ODg0NSwtMTIuMTM4NTkzLC0xMi4zNTE1NTkpIiAvPgogICAgPHBhdGgKICAgICAgIHN0eWxlPSJmaWxsOnVybCgjbGluZWFyR3JhZGllbnQxNDgyKTtzdHJva2U6I2Y2NjIzNTsiCiAgICAgICBpZD0icGF0aDE0LTMiCiAgICAgICBkPSJNIDMxLjU5ODgwNiwzNC4zNjMyNCAyMC43MDMyNzYsMzEuNDU0OTQ4IDEwLjUyODIwOSwzNS4zOTQxOTMgOS45MjcyNTU1LDI0LjEzMzIxNyAzLjAzNjU0MjcsMTUuNjczNDQ3IDEzLjU2MDY2MywxMS42MjIwNzIgMTkuNDc3MDM1LDIuNDU0NDAyNCAyNi41ODIyNTIsMTEuMjExNDkyIDM3LjEyOTQ4NCwxNC4wMDUzMyAzMC45OTY2MywyMy40Njg4ODMgWiIKICAgICAgIHRyYW5zZm9ybT0ibWF0cml4KDUuNTk1OTk1NiwwLDAsNS42Mjg4ODQ1LC0xMi4xMzg1OTMsLTEyLjM1MTU1OSkiIC8+CiAgPC9nPgo8L3N2Zz4K","base64").toString()}},{key:"pencil",value:function pencil(){return Buffer("PHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDQ2OS4zMzEgNDY5LjMzMSI+Cgk8Zz4KCQk8cGF0aCBkPSJNNDM4LjkzMSwzMC40MDNjLTQwLjQtNDAuNS0xMDYuMS00MC41LTE0Ni41LDBsLTI2OC42LDI2OC41Yy0yLjEsMi4xLTMuNCw0LjgtMy44LDcuN2wtMTkuOSwxNDcuNAoJCWMtMC42LDQuMiwwLjksOC40LDMuOCwxMS4zYzIuNSwyLjUsNiw0LDkuNSw0YzAuNiwwLDEuMiwwLDEuOC0wLjFsODguOC0xMmM3LjQtMSwxMi42LTcuOCwxMS42LTE1LjJjLTEtNy40LTcuOC0xMi42LTE1LjItMTEuNgoJCWwtNzEuMiw5LjZsMTMuOS0xMDIuOGwxMDguMiwxMDguMmMyLjUsMi41LDYsNCw5LjUsNHM3LTEuNCw5LjUtNGwyNjguNi0yNjguNWMxOS42LTE5LjYsMzAuNC00NS42LDMwLjQtNzMuMwoJCVM0NTguNTMxLDQ5LjkwMyw0MzguOTMxLDMwLjQwM3ogTTI5Ny42MzEsNjMuNDAzbDQ1LjEsNDUuMWwtMjQ1LjEsMjQ1LjFsLTQ1LjEtNDUuMUwyOTcuNjMxLDYzLjQwM3ogTTE2MC45MzEsNDE2LjgwM2wtNDQuMS00NC4xCgkJbDI0NS4xLTI0NS4xbDQ0LjEsNDQuMUwxNjAuOTMxLDQxNi44MDN6IE00MjQuODMxLDE1Mi40MDNsLTEwNy45LTEwNy45YzEzLjctMTEuMywzMC44LTE3LjUsNDguOC0xNy41YzIwLjUsMCwzOS43LDgsNTQuMiwyMi40CgkJczIyLjQsMzMuNywyMi40LDU0LjJDNDQyLjMzMSwxMjEuNzAzLDQzNi4xMzEsMTM4LjcwMyw0MjQuODMxLDE1Mi40MDN6Ii8+Cgk8L2c+Cjwvc3ZnPg==","base64").toString()}},{key:"compass",value:function compass(){return Buffer("PHN2ZyB2aWV3Qm94PSItMzEgMCA1MTIgNTEyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxwYXRoIGQ9Im0yMDkuOTc2NTYyIDB2NjIuNTExNzE5Yy0zNC4xODc1IDYuOTY4NzUtNTkuOTkyMTg3IDM3LjI2MTcxOS01OS45OTIxODcgNzMuNDcyNjU2IDAgNDEuMzQ3NjU2IDMzLjY0MDYyNSA3NC45OTIxODcgNzQuOTg4MjgxIDc0Ljk5MjE4NyA0MS4zNTE1NjMgMCA3NC45OTIxODgtMzMuNjQ0NTMxIDc0Ljk5MjE4OC03NC45OTIxODcgMC0zNi4yMTA5MzctMjUuODA0Njg4LTY2LjUwMzkwNi01OS45OTIxODgtNzMuNDcyNjU2di02Mi41MTE3MTl6bTI5Ljk5NjA5NCAxNTAuOTg0Mzc1aC0yOS45OTYwOTR2LTMwaDI5Ljk5NjA5NHptMCAwIi8+CiAgPHBhdGggZD0ibTAgMzMwLjk2MDkzOHYyOS45OTYwOTNoNzMuNTg1OTM4bC0yMC4xOTkyMTkgMzQuODMyMDMxYy0xMS4zMzU5MzggMTkuNTU0Njg4LTkuNzE4NzUgNDEuOTk2MDk0LjQyNTc4MSA1OS42Nzk2ODhsLTI0LjA4MjAzMSA0MS40NzI2NTYgMjUuOTU3MDMxIDE1LjA1ODU5NCA4Ny4wNjY0MDYtMTUxLjA0Mjk2OWg2Ny4yMjI2NTZ2MjkuOTk2MDk0aDI5Ljk5NjA5NHYtMjkuOTk2MDk0aDY3LjIyMjY1Nmw4Ny4wNjY0MDcgMTUxLjA0Mjk2OSAyNS45NTcwMzEtMTUuMDU4NTk0LTI0LjA4MjAzMS00MS40NzI2NTZjMTAuMTQ0NTMxLTE3LjY4MzU5NCAxMS43NjE3MTktNDAuMTI1LjQyNTc4MS01OS42Nzk2ODhsLTIwLjE5OTIxOS0zNC44MzIwMzFoNzMuNTg1OTM4di0yOS45OTYwOTNoLTkwLjk4NDM3NWwtNjYuNzIyNjU2LTExNS4wNTA3ODJjLTE1LjM4NjcxOSAxMi45NzI2NTYtMzQuMzgyODEzIDIxLjQ1NzAzMi01NS4zOTg0MzggMjMuODYzMjgybDUyLjkzMzU5NCA5MS4xODc1aC00OS44MDQ2ODh2LTI5Ljk5NjA5NGgtMjkuOTk2MDk0djI5Ljk5NjA5NGgtNDkuODA4NTkzbDUyLjkzNzUtOTEuMTg3NWMtMjEuMDE1NjI1LTIuNDA2MjUtNDAuMDExNzE5LTEwLjg5MDYyNi01NS4zOTg0MzgtMjMuODYzMjgybC02Ni43MjI2NTYgMTE1LjA1MDc4MnptMCAwIi8+Cjwvc3ZnPg==","base64").toString()}},{key:"eraser",value:function eraser(){return Buffer("PHN2ZyB2aWV3Qm94PSIwIDAgNTEyLjAwMTAyIDUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxnPgogICAgICAgIDxwYXRoIGQ9Im0yMzguNjQwNjI1IDE1Ny43OTI5NjljLTMuODk4NDM3IDMuOTEwMTU2LTMuODk4NDM3IDEwLjIzODI4MSAwIDE0LjE0MDYyNSAzLjkxMDE1NiAzLjkwNjI1IDEwLjIzODI4MSAzLjkwNjI1IDE0LjE0ODQzNyAwIDMuOTAyMzQ0LTMuOTAyMzQ0IDMuOTAyMzQ0LTEwLjIzMDQ2OSAwLTE0LjE0MDYyNS0zLjkxMDE1Ni0zLjkwMjM0NC0xMC4yMzgyODEtMy45MDIzNDQtMTQuMTQ4NDM3IDB6bTAgMCIvPgogICAgICAgIDxwYXRoIGQ9Im00OTcuMzM5ODQ0IDExNi4wODIwMzEtMTAxLjQxNzk2OS0xMDEuNDE3OTY5Yy0xOS41MzUxNTYtMTkuNTUwNzgxLTUxLjE2MDE1Ni0xOS41NTA3ODEtNzAuNzE0ODQ0IDAtMTUuMzUxNTYyIDE1LjM1MTU2My0yOTcuNTg5ODQzIDI5Ny41ODk4NDQtMzEwLjU0Mjk2OSAzMTAuNTQyOTY5LTE5LjU0Mjk2OCAxOS41NDI5NjktMTkuNTU4NTkzIDUxLjE2Nzk2OSAwIDcwLjcxNDg0NGwxMDEuNDE3OTY5IDEwMS40MTc5NjljOS4yNTM5MDcgOS4yNTM5MDYgMjEuNjQ4NDM4IDE0LjY1NjI1IDM2LjMyMDMxMyAxNC42NTYyNWgxOTUuNTk3NjU2YzUuNTE5NTMxIDAgMTAtNC40NzY1NjMgMTAtMTAgMC01LjUxOTUzMi00LjQ4MDQ2OS0xMC0xMC0xMGgtMTU1Ljg2NzE4OGMuNzU3ODEzLS43NTM5MDYgMzA0Ljc4OTA2My0zMDQuNzg1MTU2IDMwNS4yMDcwMzItMzA1LjIwMzEyNSAxOS41MzkwNjItMTkuNTQyOTY5IDE5LjU1NDY4Ny01MS4xNjc5NjkgMC03MC43MTA5Mzh6bS0yOTYuMTI4OTA2IDMzOC41NTQ2ODhjLTExLjY5NTMxMyAxMS42OTUzMTItMzAuNzIyNjU3IDExLjY5NTMxMi00Mi40MTc5NjkgMGwtMTAxLjQyOTY4OC0xMDEuNDI5Njg4Yy01LjY2NDA2Mi01LjY2NDA2Mi04Ljc4NTE1Ni0xMy4xOTUzMTItOC43ODUxNTYtMjEuMjA3MDMxIDAtOC4wMDc4MTIgMy4xMjEwOTQtMTUuNTQyOTY5IDguNzg1MTU2LTIxLjIwNzAzMWwxMTcuNjQ4NDM4LTExNy42NDg0MzggMTQzLjg0NzY1NiAxNDMuODU1NDY5em0tMTcyLjQxMDE1Ny03Mi44NjMyODFjLTExLjcyNjU2Mi0xMS43MTg3NS0xMS43MzA0NjktMzAuNjg3NS4wMDM5MDctNDIuNDIxODc2bC4yNzM0MzctLjI3MzQzN2MxLjUwMzkwNiAxMC42Njc5NjkgNi4zOTA2MjUgMjAuNTE5NTMxIDE0LjE0NDUzMSAyOC4yNzM0MzdsMTAxLjQyOTY4OCAxMDEuNDI1NzgyYzcuOTQ5MjE4IDcuOTUzMTI1IDE3LjkzNzUgMTIuNjU2MjUgMjguMjk2ODc1IDE0LjEyMTA5NGwtLjI5Njg3NS4yOTY4NzRjLTExLjY5OTIxOSAxMS42OTUzMTMtMzAuNzM0Mzc1IDExLjY5OTIxOS00Mi40Mjk2ODggMHptNDU0LjM5NDUzMS0yMDkuMTIxMDk0LTE1MC4xOTUzMTIgMTUwLjIwMzEyNS0xNDMuODQ3NjU2LTE0My44NTE1NjMgMTUwLjE5OTIxOC0xNTAuMTk5MjE4YzExLjcyNjU2My0xMS43MjY1NjMgMzAuNjk1MzEzLTExLjczODI4MiA0Mi40MjU3ODIgMGwxMDEuNDIxODc1IDEwMS40MjE4NzRjMTEuNzMwNDY5IDExLjcyMjY1NyAxMS43MzQzNzUgMzAuNjg3NS0uMDAzOTA3IDQyLjQyNTc4MnptMCAwIi8+CiAgICAgICAgPHBhdGggZD0ibTMzOS4zNTkzNzUgNTcuMDgyMDMxLTcyLjQyOTY4NyA3Mi40Mjk2ODhjLTMuOTA2MjUgMy45MDYyNS0zLjkwNjI1IDEwLjIzODI4MSAwIDE0LjE0MDYyNSAzLjkwNjI1IDMuOTA2MjUgMTAuMjM0Mzc0IDMuOTA2MjUgMTQuMTQwNjI0IDBsNzIuNDI5Njg4LTcyLjQyOTY4OGMzLjkwNjI1LTMuOTA2MjUgMy45MDYyNS0xMC4yMzgyODEgMC0xNC4xNDA2MjUtMy45MDYyNS0zLjkwNjI1LTEwLjIzNDM3NS0zLjkwNjI1LTE0LjE0MDYyNSAwem0wIDAiLz4KICAgICAgICA8cGF0aCBkPSJtMzg4IDQ5MS45OTYwOTRjLTUuNTIzNDM4IDAtMTAgNC40ODA0NjgtMTAgMTAgMCA1LjUyMzQzNyA0LjQ3NjU2MiAxMCAxMCAxMGgyMGM1LjUxOTUzMSAwIDEwLTQuNDc2NTYzIDEwLTEwIDAtNS41MTk1MzItNC40ODA0NjktMTAtMTAtMTB6bTAgMCIvPgogICAgICAgIDxwYXRoIGQ9Im00NDggNDkxLjk5NjA5NGMtNS41MjM0MzggMC0xMCA0LjQ4MDQ2OC0xMCAxMCAwIDUuNTIzNDM3IDQuNDc2NTYyIDEwIDEwIDEwaDE5Ljk5NjA5NGM1LjUyMzQzNyAwIDEwLTQuNDc2NTYzIDEwLTEwIDAtNS41MTk1MzItNC40NzY1NjMtMTAtMTAtMTB6bTAgMCIvPgogICAgPC9nPgo8L3N2Zz4=","base64").toString()}},{key:"arrow",value:function arrow(){return Buffer("PD94bWwgdmVyc2lvbj0nMS4wJyBlbmNvZGluZz0ndXRmLTgnPz4KPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDEyOSAxMjkiPgogIDxnPgogICAgPHBhdGggZD0ibTEyMS4zLDM0LjZjLTEuNi0xLjYtNC4yLTEuNi01LjgsMGwtNTEsNTEuMS01MS4xLTUxLjFjLTEuNi0xLjYtNC4yLTEuNi01LjgsMC0xLjYsMS42LTEuNiw0LjIgMCw1LjhsNTMuOSw1My45YzAuOCwwLjggMS44LDEuMiAyLjksMS4yIDEsMCAyLjEtMC40IDIuOS0xLjJsNTMuOS01My45YzEuNy0xLjYgMS43LTQuMiAwLjEtNS44eiIvPgogIDwvZz4KPC9zdmc+Cg==","base64").toString()}},{key:"cross",value:function cross(){return Buffer("PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MCA1MCI+DQogICAgPGc+DQogICAgICAgIDxwYXRoIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIGQ9Ik01IDUgTDQ1IDQ1Ii8+DQogICAgICAgIDxwYXRoIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIGQ9Ik00NSA1IEw1IDQ1Ii8+DQogICAgPC9nPg0KPC9zdmc+","base64").toString()}},{key:"next",value:function next(){return Buffer("PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgICB2aWV3Qm94PSIwIDAgNTEyLjE3MSA1MTIuMTcxIj4KICAgIDxnPgogICAgICAgIDxwYXRoCiAgICAgICAgICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsIDUxMikgcm90YXRlKDI3MCkiCiAgICAgICAgICAgIGZpbGw9IiNGRkYiCiAgICAgICAgICAgIGQ9Ik00NzkuMDQ2LDI4My45MjVjLTEuNjY0LTMuOTg5LTUuNTQ3LTYuNTkyLTkuODU2LTYuNTkySDM1Mi4zMDVWMTAuNjY3QzM1Mi4zMDUsNC43NzksMzQ3LjUyNiwwLDM0MS42MzgsMEgxNzAuOTcxCiAgICAgICAgICAgIGMtNS44ODgsMC0xMC42NjcsNC43NzktMTAuNjY3LDEwLjY2N3YyNjYuNjY3SDQyLjk3MWMtNC4zMDksMC04LjE5MiwyLjYwMy05Ljg1Niw2LjU3MWMtMS42NDMsMy45ODktMC43NDcsOC41NzYsMi4zMDQsMTEuNjI3CiAgICAgICAgICAgIGwyMTIuOCwyMTMuNTA0YzIuMDA1LDIuMDA1LDQuNzE1LDMuMTM2LDcuNTUyLDMuMTM2czUuNTQ3LTEuMTMxLDcuNTUyLTMuMTE1bDIxMy40MTktMjEzLjUwNAogICAgICAgICAgICBDNDc5Ljc5MywyOTIuNTAxLDQ4MC43MSwyODcuOTE1LDQ3OS4wNDYsMjgzLjkyNXoiLz4KICAgIDwvZz4KPC9zdmc+","base64").toString()}},{key:"restart",value:function restart(){return Buffer("PHN2ZwogICAgICAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgICAgICB2aWV3Qm94PSIwIDAgNTcgNTUiCiAgICAgICAgdmVyc2lvbj0iMS4xIj4KICAgIDxnIHRyYW5zZm9ybT0ibWF0cml4KDAuMjY0NTgzMzMsMCwwLDAuMjY0NTgzMzMsLTI4LjY2ODU2OSwxMTQuMjUwNCkiPgogICAgICAgIDxwYXRoCiAgICAgICAgICAgICAgICBkPSJtIDE0Mi42MjEzOCwtMjUzLjAwMjA3IGMgMTEuNTE2NjgsMTEuNTAyMTkgMjQuNTA4NTEsMjguNTQyMjQgMzkuNTA0NCwyNC41ODM0IDcuNDkyOTIsLTEuOTc4MDkgMTIuMjc5NzksLTEyLjc2NTkzIDExLjEwMzg4LC0yMC40MjU4MiAtMC43OTk4MiwtNS4yMTAwNyAtMTEuMTAzODgsLTEwLjUwMjYyIC0xMS4xMDM4OCwtMTAuNTAyNjIgLTYuOTUzNDcsLTMuNDYyMjUgLTEzLjU0NDc4LC03Ljk2NzUyIC0xOS4zMjQ4NSwtMTMuNzYyMDggLTI4Ljg3MTM5LC0yOC44ODU4NyAtMjguODcxMzksLTc1Ljg1MDc1IDAsLTEwNC43MjIxMyAyOC44NzEzOCwtMjguODI3OTMgNzUuODA3MywtMjguODI3OTMgMTA0LjcyMjE0LDAgMjguODQyNCwyOC45MDAzNSAyOC44NDI0LDc1LjgzNjI2IDAsMTA0LjcyMjEzIC0wLjA3MjQsMC4wODY5IC0wLjMwNDIyLDAuMjMxNzggLTAuNDA1NjIsMC4zNjIxNiBoIC0wLjAyOSBsIC0xNy4xMDg0MywtMTcuMDc5NDYgYyAwLDAgLTIuMzk4Miw1MS45NDM3IDAuMTAxNCw1NC4yMzcwNSAyLjA3MzIxLDEuOTAyMTUgNTQuMjA4MDksMC4wNzI0IDU0LjIwODA5LDAuMDcyNCBsIC0xNy4wMzYsLTE3LjAzNiBjIDAuMTAxNDEsLTAuMTczODMgMC4yNjA3NiwtMC4zNDc2NyAwLjM5MTEzLC0wLjQ0OTA3IDQwLjAyNTkxLC00MC4wMTE0MiA0MC4wMjU5MSwtMTA0LjkyNDk1IDAsLTE0NC45MzYzNyAtNDAuMDgzODUsLTQwLjA1NDg4IC0xMDQuOTUzOTEsLTQwLjA1NDg4IC0xNDUuMDIzMjgsMCAtMzkuOTk2OTMsNDAuMDExNDIgLTQwLjA0MDM5LDEwNC45MjQ5NSAwLDE0NC45MzYzNyB6IgogICAgICAgICAgICAgICAgc3R5bGU9ImZpbGw6I0ZGRkZGRjsiLz4KICAgIDwvZz4KPC9zdmc+Cg==","base64").toString()}},{key:"home",value:function home(){return Buffer("PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDMwNi43NzMgMzA2Ljc3MyI+CiAgICA8Zz4KICAgICAgICA8cGF0aCBzdHlsZT0iZmlsbDojRkZGRkZGOyIgZD0iTTMwMi45MywxNDkuNzk0YzUuNTYxLTYuMTE2LDUuMDI0LTE1LjQ5LTEuMTk5LTIwLjkzMkwxNjQuNjMsOC44OTgKCQljLTYuMjIzLTUuNDQyLTE2LjItNS4zMjgtMjIuMjkyLDAuMjU3TDQuNzcxLDEzNS4yNThjLTYuMDkyLDUuNTg1LTYuMzkxLDE0Ljk0Ny0wLjY2MiwyMC45MDJsMy40NDksMy41OTIKCQljNS43MjIsNS45NTUsMTQuOTcxLDYuNjY1LDIwLjY0NSwxLjU4MWwxMC4yODEtOS4yMDd2MTM0Ljc5MmMwLDguMjcsNi43MDEsMTQuOTY1LDE0Ljk2NSwxNC45NjVoNTMuNjI0CgkJYzguMjY0LDAsMTQuOTY1LTYuNjk1LDE0Ljk2NS0xNC45NjV2LTk0LjNoNjguMzk4djk0LjNjLTAuMTE5LDguMjY0LDUuNzk0LDE0Ljk1OSwxNC4wNTgsMTQuOTU5aDU2LjgyOAoJCWM4LjI2NCwwLDE0Ljk2NS02LjY5NSwxNC45NjUtMTQuOTY1VjE1NC4wMjRjMCwwLDIuODQsMi40ODgsNi4zNDMsNS41NjdjMy40OTcsMy4wNzMsMTAuODQyLDAuNjA5LDE2LjQwMy01LjUxM0wzMDIuOTMsMTQ5Ljc5NHoiCiAgICAgICAgLz4KICAgIDwvZz4KPC9zdmc+","base64").toString()}},{key:"gear",value:function gear(){return Buffer("PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii01MCAtNTAgMTAwIDEwMCI+CiAgICA8Zz4KICAgICAgICA8cGF0aCBkPSJNMzcuNDM5OTUxOTIzMDQ2MDUgLTYuNSBMNDcuNDM5OTUxOTIzMDQ2MDUgLTYuNSBMNDcuNDM5OTUxOTIzMDQ2MDUgNi41IEwzNy40Mzk5NTE5MjMwNDYwNSA2LjUgQTM4IDM4IDAgMCAxIDM1LjY3Mzk0OTQ4MTgyNTkzIDEzLjA5MDgxMDgzNjkyNDE3NCBMMzUuNjczOTQ5NDgxODI1OTMgMTMuMDkwODEwODM2OTI0MTc0IEw0NC4zMzQyMDM1MTk2NzAzMiAxOC4wOTA4MTA4MzY5MjQxNzQgTDM3LjgzNDIwMzUxOTY3MDMyIDI5LjM0OTE0MTA4NjEyMTg4IEwyOS4xNzM5NDk0ODE4MjU5MyAyNC4zNDkxNDEwODYxMjE4OCBBMzggMzggMCAwIDEgMjQuMzQ5MTQxMDg2MTIxODggMjkuMTczOTQ5NDgxODI1OTMgTDI0LjM0OTE0MTA4NjEyMTg4IDI5LjE3Mzk0OTQ4MTgyNTkzIEwyOS4zNDkxNDEwODYxMjE4OCAzNy44MzQyMDM1MTk2NzAzMiBMMTguMDkwODEwODM2OTI0MTg0IDQ0LjMzNDIwMzUxOTY3MDMyIEwxMy4wOTA4MTA4MzY5MjQxODMgMzUuNjczOTQ5NDgxODI1OTMgQTM4IDM4IDAgMCAxIDYuNSAzNy40Mzk5NTE5MjMwNDYwNSBMNi41IDM3LjQzOTk1MTkyMzA0NjA1IEw2LjUwMDAwMDAwMDAwMDAwMSA0Ny40Mzk5NTE5MjMwNDYwNSBMLTYuNDk5OTk5OTk5OTk5OTk1IDQ3LjQzOTk1MTkyMzA0NjA2IEwtNi40OTk5OTk5OTk5OTk5OTYgMzcuNDM5OTUxOTIzMDQ2MDYgQTM4IDM4IDAgMCAxIC0xMy4wOTA4MTA4MzY5MjQxNyAzNS42NzM5NDk0ODE4MjU5MyBMLTEzLjA5MDgxMDgzNjkyNDE3IDM1LjY3Mzk0OTQ4MTgyNTkzIEwtMTguMDkwODEwODM2OTI0MTcgNDQuMzM0MjAzNTE5NjcwMzIgTC0yOS4zNDkxNDEwODYxMjE4NyAzNy44MzQyMDM1MTk2NzAzMjUgTC0yNC4zNDkxNDEwODYxMjE4NzIgMjkuMTczOTQ5NDgxODI1OTM2IEEzOCAzOCAwIDAgMSAtMjkuMTczOTQ5NDgxODI1OTIgMjQuMzQ5MTQxMDg2MTIxODkgTC0yOS4xNzM5NDk0ODE4MjU5MiAyNC4zNDkxNDEwODYxMjE4OSBMLTM3LjgzNDIwMzUxOTY3MDMxIDI5LjM0OTE0MTA4NjEyMTg5MyBMLTQ0LjMzNDIwMzUxOTY3MDMxIDE4LjA5MDgxMDgzNjkyNDIgTC0zNS42NzM5NDk0ODE4MjU5MiAxMy4wOTA4MTA4MzY5MjQxOTMgQTM4IDM4IDAgMCAxIC0zNy40Mzk5NTE5MjMwNDYwNSA2LjUwMDAwMDAwMDAwMDAwMzYgTC0zNy40Mzk5NTE5MjMwNDYwNSA2LjUwMDAwMDAwMDAwMDAwMzYgTC00Ny40Mzk5NTE5MjMwNDYwNSA2LjUwMDAwMDAwMDAwMDAwNCBMLTQ3LjQzOTk1MTkyMzA0NjA2IC02LjQ5OTk5OTk5OTk5OTk5MyBMLTM3LjQzOTk1MTkyMzA0NjA2IC02LjQ5OTk5OTk5OTk5OTk5NCBBMzggMzggMCAwIDEgLTM1LjY3Mzk0OTQ4MTgyNTkzIC0xMy4wOTA4MTA4MzY5MjQxNjcgTC0zNS42NzM5NDk0ODE4MjU5MyAtMTMuMDkwODEwODM2OTI0MTY3IEwtNDQuMzM0MjAzNTE5NjcwMzIgLTE4LjA5MDgxMDgzNjkyNDE2MyBMLTM3LjgzNDIwMzUxOTY3MDMyNSAtMjkuMzQ5MTQxMDg2MTIxODcgTC0yOS4xNzM5NDk0ODE4MjU5MzYgLTI0LjM0OTE0MTA4NjEyMTg3IEEzOCAzOCAwIDAgMSAtMjQuMzQ5MTQxMDg2MTIxODkzIC0yOS4xNzM5NDk0ODE4MjU5MiBMLTI0LjM0OTE0MTA4NjEyMTg5MyAtMjkuMTczOTQ5NDgxODI1OTIgTC0yOS4zNDkxNDEwODYxMjE4OTcgLTM3LjgzNDIwMzUxOTY3MDMwNCBMLTE4LjA5MDgxMDgzNjkyNDIgLTQ0LjMzNDIwMzUxOTY3MDMwNCBMLTEzLjA5MDgxMDgzNjkyNDE5NSAtMzUuNjczOTQ5NDgxODI1OTIgQTM4IDM4IDAgMCAxIC02LjUwMDAwMDAwMDAwMDAwNSAtMzcuNDM5OTUxOTIzMDQ2MDUgTC02LjUwMDAwMDAwMDAwMDAwNSAtMzcuNDM5OTUxOTIzMDQ2MDUgTC02LjUwMDAwMDAwMDAwMDAwNyAtNDcuNDM5OTUxOTIzMDQ2MDUgTDYuNDk5OTk5OTk5OTk5OTkgLTQ3LjQzOTk1MTkyMzA0NjA2IEw2LjQ5OTk5OTk5OTk5OTk5MiAtMzcuNDM5OTUxOTIzMDQ2MDYgQTM4IDM4IDAgMCAxIDEzLjA5MDgxMDgzNjkyNDE0OSAtMzUuNjczOTQ5NDgxODI1OTQgTDEzLjA5MDgxMDgzNjkyNDE0OSAtMzUuNjczOTQ5NDgxODI1OTQgTDE4LjA5MDgxMDgzNjkyNDE0MiAtNDQuMzM0MjAzNTE5NjcwMzMgTDI5LjM0OTE0MTA4NjEyMTg0NyAtMzcuODM0MjAzNTE5NjcwMzQgTDI0LjM0OTE0MTA4NjEyMTg1NCAtMjkuMTczOTQ5NDgxODI1OTUgQTM4IDM4IDAgMCAxIDI5LjE3Mzk0OTQ4MTgyNTkyIC0yNC4zNDkxNDEwODYxMjE4OTMgTDI5LjE3Mzk0OTQ4MTgyNTkyIC0yNC4zNDkxNDEwODYxMjE4OTMgTDM3LjgzNDIwMzUxOTY3MDMwNCAtMjkuMzQ5MTQxMDg2MTIxODk3IEw0NC4zMzQyMDM1MTk2NzAzMDQgLTE4LjA5MDgxMDgzNjkyNDIgTDM1LjY3Mzk0OTQ4MTgyNTkyIC0xMy4wOTA4MTA4MzY5MjQxOTcgQTM4IDM4IDAgMCAxIDM3LjQzOTk1MTkyMzA0NjA1IC02LjUwMDAwMDAwMDAwMDAwNyBNMCAtMjBBMjAgMjAgMCAxIDAgMCAyMCBBMjAgMjAgMCAxIDAgMCAtMjAiIGZpbGw9IiMyYjJhMmEiPjwvcGF0aD4KICAgIDwvZz4KPC9zdmc+","base64").toString()}},{key:"dot",value:function dot(){return Buffer("PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDEwMCAxMDAiPgogICAgPGc+CiAgICAgICAgPGVsbGlwc2UgY3g9IjUwIiBjeT0iNTAiIHJ4PSIyMCIgcnk9IjIwIi8+CiAgICA8L2c+Cjwvc3ZnPg==","base64").toString()}},{key:"question",value:function question(){return Buffer("PHN2ZyB2aWV3Qm94PSIwIDAgNjQgNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogICAgPHBhdGggZD0iTTE2LjYzNiAxMy43OTNjLS4zMzguMjg4LTEuNTk1IDEuNzc3LTIuMTc1IDMuNzk0LS41OCAyLjAxNy0uMTQ0IDQuODAyLS4wOTYgNS40NzUuMDQ4LjY3MiAxLjY0NC4zODQgMS44ODUuMTQ0LjI0LS4yNC0uMDUtLjMzNi0uMTk0LTMuNTU0LS4xNDUtMy4yMTggMS4zNTQtNC44OTggMS4zNTQtNS4wOXMtLjQ3OC0xLjAyLS43NzQtLjc3em0xNi40MzcgMzkuNTI0Yy0zLjUzLS4wOTYtNy4zNDggMS41ODUtNy4zIDUuMzguMDQ4IDMuNzkzIDMuMzg0IDUuMTM4IDUuODk4IDUuMjgyIDIuNTE1LjE0MyA5LjA5LS4zMzcgOC45OTMtNC4xOC0uMDk3LTMuODQyLTMuMzgtNi4zNy03LjU5LTYuNDgzem0tLjkxOCA4LjU5NmMtMi4yMjQgMC0zLjg2Ny0xLjgyNS0zLjkxNi0zLjI2Ni0uMDUtMS40NCAxLjMwNC0zLjU1NCA1LjAyNy0zLjY1IDEuNjktLjA0NCA0LjczOCAxLjE1MyA0LjkzIDMuODkuMTk0IDIuNzM4LTMuODIgMy4wMjYtNi4wNDIgMy4wMjZ6TTMyLjM0OC4wMWMtMTEuOTktLjMzNi0yMC4wNjMgNy41NC0yMS44NSAxNC42NDgtMS43OSA3LjEwOCAxLjggMTYuNjUzIDIuMTc0IDE2Ljc2IDUuNzA1IDEuNjMzIDEzLjc3OC0xLjk3IDE0LjAyLTIuNC4yNDItLjQzMy44MjItLjg2NS0xLjI1Ny00LjgwM3MuNTgtMTAuMTggNi41MjYtOS4zMTdjNS45NDcuODY0IDYuNzcgNS43MTUgNS45NDcgOS40Ni0uODIyIDMuNzQ3LTMuNzcgNy4xMS02Ljg2NSAxMS40My0zLjA5NCA0LjMyMy0yLjk1IDEwLjk1LTIuNTYyIDEyLjA1NS4zODcgMS4xMDQgOS4wNCAxLjM0NSAxMS4wMjIgMS4wMSAxLjk4Mi0uMzM3IDEuMjEgMS4zOTIgMy42NzQtNy40NDUgMi40NjYtOC44MzYgOS40NzUtMTEuMTQyIDkuODE0LTIzLjM4OEM1My4zMyA1Ljc3MyA0NC4zMzcuMzQ3IDMyLjM0OC4wMXptMTguMTMgMTkuNzg2Yy0uMjktLjI4OC0yLjUxNS00Ljk5NC0yLjk5OC00Ljk5NC0uNDgzIDAtMS4wMTUuNjI0LS44Ny43NjhzMy41MyA1LjIzNSAzLjU3NyA1LjcxNWMuMDQ4LjQ4LS41MzIgMi41OTMtLjU4IDIuNDUtLjA0OC0uMTQ1LTMuMTQyLTYuMDUyLTMuNDMyLTYuMDUyLS4yOSAwLS45NjcuNjcyLS43MjUgMS4wMDguMjQyLjMzNyAzLjc3IDYuMzQgMy43NyA2LjM0cy0uOTE4IDIuMjU3LTEuMDYzIDIuMTZjLS4xNDUtLjA5NS0zLjI4Ny02LjI0Mi0zLjQ4LTYuMjQycy0uNjMuODY0LS41MzMgMS4xMDVjLjA5Ny4yNCAzLjUzIDUuOTA3IDMuNTMgNi4yOSAwIC4zODUtMS41IDIuMTYyLTEuNSAyLjE2MnMtMi42Ni02LjAwMy0yLjktNi4wMDNjLS4yNDMgMC0uNzc0IDEuMTUzLS43NzQgMS4xNTNzMi45OTcgNS45MDcgMi45OTcgNi4wNWMwIC4xNDUtMS4xMTIgMS44NzQtMS4xMTIgMS44NzRzLTIuMjIzLTUuMzgtMi4zNjgtNS4zOGMtLjE0NSAwLS44MjIuOTEyLS43MjUgMS4xMDQuMDk3LjE5MiAyLjM3IDQuOTk1IDIuMzcgNS4yMzUgMCAuMjQtLjkyIDIuODgtMS4wNjUgMi43MzYtLjE0NS0uMTQ0LTIuNDY2LTUuODYtMi42Ni01LjkwNy0uMTkyLS4wNS0uOTY2IDEuMDA4LS43MjQgMS4zNDQuMjQyLjMzNiAyLjgwNCA1LjcxNSAyLjgwNCA1Ljk1NSAwIC4yNC0uNjc3IDIuMjU2LS44MjIgMi4yMDhzLTIuOTUtNi4yOS0yLjk1LTYuMjktLjg3Ljk2LS43NzIgMS4yNDggMy4wNDYgNi4zNCAzLjA0NiA2LjM0bC0uOTY4IDIuNHMtMi45NS02Ljk2My0zLjA5NC02Ljk2M2MtLjE0NSAwLS43MjUgMS4yLS42MjggMS40OXMzLjQ4IDYuODE4IDMuMzg0IDcuMTU1Yy0uMDk3LjMzNi0xLjE2LjQ4LTEuNDAyLjI4OHMtMy4yNC02LjEtMy4yNC02LjEtLjcyNC45Ni0uNDgyIDEuMjVjLjI0Mi4yODggMi43NTYgNC44OTggMi41MTQgNC44OThzLTEuODM3LjI4OC0xLjgzNyAwLTEuMTEyLTIuODgtMS4zNTQtMi45My0uOTY3LjI5LS45Mi41NzdjLjA1LjI5IDEuNDUgMi4zMDYgMS4xMTMgMi4zMDYtLjMzOCAwLTIuNTE0LS4yNC0yLjYxLS4zODQtLjA5OC0uMTQ0LjA0Ny01LjM4IDEuNzg4LTguNTQ4IDEuNzQtMy4xNyA3LjI1LTkuNDEzIDcuNjM4LTEzLjc4My4zODctNC4zNy0uOTY3LTcuODI3LTUuNDYzLTEwLjUxNi00LjQ5Ny0yLjY5LTEwLjczMy0uMjQtMTIuMjggNS4wOXMxLjg4NSA5LjE3NCAxLjg4NSA5LjU1OGMwIC4zODQtNi43MiAyLjQtMTAuMDU2IDEuMjUgMCAwLTIuNjEyLTYuMTQ4LTIuMDMtMTEuOTEuNTgtNS43NjQgNi4xNC0xMS4zODMgMTAuMi0xMy4zMDRzMTMuNDQtMi42OSAxOC41MTUtLjY3MiA3LjU0MiA2LjcyMyA4LjIxOCA4LjgzNmMwIDAtMS4yNTctLjgxNi0xLjQwMi0uNzY4cy0uNDM0LjkxMi0uMTQ0IDEuMTA0Yy4yOS4xOTIgMi4zNyAyLjc4NSAyLjUxNCAzLjI2Ni4xNDUuNDguMzg3IDQuMzIuMDk3IDQuMDMyek0zMS4yODMgNTYuMzQyYy0xLjY0NC40MzItMS44MzcgMi40OTctMS42NDQgMy4yNjYuMTkzLjc2OCAxLjM1NC42MjQgMS41OTUuNDguMjQyLS4xNDQgMC0uMjQtLjE0NS0xLjE1My0uMTQ1LS45MTIuOTY3LTEuOTcgMS4xNi0yLjExMy4xOTUtLjE0My0uNDQzLS42MTctLjk2Ni0uNDh6Ii8+DQo8L3N2Zz4=","base64").toString()}},{key:"sad",value:function sad(){return Buffer("PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgPg0KICAgIDxnPg0KICAgICAgICA8Zz4NCiAgICAgICAgICAgIDxwYXRoIGZpbGw9InJlZCIgZD0iTTMyLDBDMTQuMzU1LDAsMCwxNC4zNTUsMCwzMnMxNC4zNTUsMzIsMzIsMzJzMzItMTQuMzU1LDMyLTMyUzQ5LjY0NSwwLDMyLDB6IE0zMiw2MCBDMTYuNTYxLDYwLDQsNDcuNDM5LDQsMzJTMTYuNTYxLDQsMzIsNHMyOCwxMi41NjEsMjgsMjhTNDcuNDM5LDYwLDMyLDYweiIvPg0KICAgICAgICAgICAgPGNpcmNsZSBmaWxsPSJyZWQiIGN4PSIyMC41MTgiIGN5PSIyMS4zNjEiIHI9IjQuMzM4Ii8+DQogICAgICAgICAgICA8Y2lyY2xlIGZpbGw9InJlZCIgY3g9IjQzLjQ4IiBjeT0iMjEuMzYxIiByPSI0LjMzOCIvPg0KICAgICAgICAgICAgPHBhdGggZmlsbD0icmVkIiBkPSJtMzIsMzYuNjQzYy05LjczMiwwLTE0LjM1NSw2Ljg1OS0xNS40NDEsMTAuNDg0LTAuMzE2LDEuMDU1IDAuMjgxLDIuMTYgMS4zMzQsMi40OCAwLjE5MywwLjA2MSAwLjM4OSwwLjA4OCAwLjU4MiwwLjA4OCAwLjg1NCwwIDEuNjQ2LTAuNTUzIDEuOTEyLTEuNDEgMC4wOTgtMC4zMTIgMi40ODgtNy42NDMgMTEuNjEzLTcuNjQzIDkuMTA3LDAgMTEuNTA0LDcuMjk5IDExLjYxMSw3LjY0MSAwLjI2MiwwLjg2MSAxLjA1NSwxLjQxOCAxLjkxNCwxLjQxOCAwLjE4OSwwIDAuMzgzLTAuMDI3IDAuNTcyLTAuMDg0IDEuMDU5LTAuMzE2IDEuNjYtMS40MzIgMS4zNDQtMi40ODgtMS4wODQtMy42MjctNS43MDctMTAuNDg2LTE1LjQ0MS0xMC40ODZ6Ii8+DQogICAgICAgIDwvZz4NCiAgICA8L2c+DQo8L3N2Zz4NCg==","base64").toString()}},{key:"accept",value:function accept(){return Buffer("PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDIxOCAyMTgiPg0KICAgIDxnPg0KICAgICAgICA8Y2lyY2xlIGZpbGw9IiM0Q0FGNTAiIGN4PSIxMDkiIGN5PSIxMDkiIHI9IjEwOSIgLz4NCiAgICAgICAgPHBhdGggZmlsbD0iI0NDRkY5MCINCiAgICAgICAgICAgICAgZD0iTTYyLDEwMiBMNDgsMTE2IEw5MiwxNjAgTDE4MCw3MyBMMTY2IDU5IEw5MiAxMzIgWiIvPg0KICAgIDwvZz4NCjwvc3ZnPg0K","base64").toString()}},{key:"select",value:function select(){return Buffer("PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4NCiAgICA8Zz4NCiAgICAgICAgPHBhdGggZD0iTTQxNiwxNDkuMzMzYy04Ljc2OCwwLTE2LjkzOSwyLjY2Ny0yMy43MjMsNy4yMTFDMzg2LjQzMiwxMzkuOTQ3LDM3MC41ODEsMTI4LDM1MiwxMjgNCgkJCWMtOC43NjgsMC0xNi45MzksMi42NjctMjMuNzIzLDcuMjExYy01Ljg0NS0xNi41OTctMjEuNjk2LTI4LjU0NC00MC4yNzctMjguNTQ0Yy03Ljc2NSwwLTE1LjA2MSwyLjA5MS0yMS4zMzMsNS43MzlWNDIuNjY3DQoJCQlDMjY2LjY2NywxOS4xMzYsMjQ3LjUzMSwwLDIyNCwwcy00Mi42NjcsMTkuMTM2LTQyLjY2Nyw0Mi42Njd2MjQ5LjQwOGwtNTguNjQ1LTI5LjMzM0MxMTMuODU2LDI1OC4zMjUsMTAzLjk1NywyNTYsOTQuMDgsMjU2DQoJCQljLTIyLjQ4NSwwLTQwLjc0NywxOC4yODMtNDAuNzQ3LDQwLjg3NWMwLDEwLjkwMSw0LjI0NSwyMS4xMiwxMS45NDcsMjguODIxbDEzNy45NDEsMTM3Ljk0MUMyMzQuMzg5LDQ5NC44MjcsMjc1Ljg4Myw1MTIsMzIwLDUxMg0KCQkJYzc2LjQ1OSwwLDEzOC42NjctNjIuMjA4LDEzOC42NjctMTM4LjY2N1YxOTJDNDU4LjY2NywxNjguNDY5LDQzOS41MzEsMTQ5LjMzMyw0MTYsMTQ5LjMzM3ogTTQzNy4zMzMsMzczLjMzMw0KCQkJYzAsNjQuNzA0LTUyLjY1MSwxMTcuMzMzLTExNy4zNTUsMTE3LjMzM2MtMzguNDIxLDAtNzQuNTE3LTE0Ljk1NS0xMDEuNjUzLTQyLjEzM0w4MC4zNjMsMzEwLjU5Mg0KCQkJYy0zLjY2OS0zLjY0OC01LjY5Ni04LjUzMy01LjY5Ni0xMy44NDVjMC0xMC43MDksOC43MDQtMTkuNDEzLDE5LjQxMy0xOS40MTNjNi41OTIsMCwxMy4xNjMsMS41NTcsMTkuMDcyLDQuNTAxbDc0LjA5MSwzNy4wMzUNCgkJCWMzLjMwNywxLjY0Myw3LjI1MywxLjQ3MiwxMC4zNjgtMC40NjljMy4xMzYtMS45NDEsNS4wNTYtNS4zNzYsNS4wNTYtOS4wNjdWNDIuNjY3YzAtMTEuNzU1LDkuNTU3LTIxLjMzMywyMS4zMzMtMjEuMzMzDQoJCQlzMjEuMzMzLDkuNTc5LDIxLjMzMywyMS4zMzN2MjAyLjY2N2MwLDUuODg4LDQuNzc5LDEwLjY2NywxMC42NjcsMTAuNjY3YzUuODg4LDAsMTAuNjY3LTQuNzc5LDEwLjY2Ny0xMC42Njd2LTk2DQoJCQljMC0xMS43NTUsOS41NTctMjEuMzMzLDIxLjMzMy0yMS4zMzNzMjEuMzMzLDkuNTc5LDIxLjMzMywyMS4zMzN2OTZjMCw1Ljg4OCw0Ljc3OSwxMC42NjcsMTAuNjY3LDEwLjY2Nw0KCQkJczEwLjY2Ny00Ljc3OSwxMC42NjctMTAuNjY3di03NC42NjdjMC0xMS43NTUsOS41NTctMjEuMzMzLDIxLjMzMy0yMS4zMzNzMjEuMzMzLDkuNTc5LDIxLjMzMywyMS4zMzN2NzQuNjY3DQoJCQljMCw1Ljg4OCw0Ljc3OSwxMC42NjcsMTAuNjY3LDEwLjY2N2M1Ljg4OCwwLDEwLjY2Ny00Ljc3OSwxMC42NjctMTAuNjY3VjE5MmMwLTExLjc1NSw5LjU1Ny0yMS4zMzMsMjEuMzMzLTIxLjMzMw0KCQkJczIxLjMzMyw5LjU3OSwyMS4zMzMsMjEuMzMzVjM3My4zMzN6Ii8+DQogICAgPC9nPg0KPC9zdmc+","base64").toString()}}]);return Icons}();exports.Icons=Icons;

}).call(this,require("buffer").Buffer)
},{"buffer":2}],7:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var typetools_1=require("../../utils/typetools");var BemInfo=/*#__PURE__*/function(){function BemInfo(blockName,elementName){_classCallCheck(this,BemInfo);this._modifiers=new Map;this._blockName=blockName;this._elementName=elementName}_createClass(BemInfo,[{key:"updateModifier",value:function updateModifier(modifier,value){this._modifiers.set(modifier,value)}},{key:"getClassName",value:function getClassName(){var className=this._getClassNameWithoutModifiers();var _iteratorNormalCompletion=true;var _didIteratorError=false;var _iteratorError=undefined;try{for(var _iterator=this._modifiers.keys()[Symbol.iterator](),_step;!(_iteratorNormalCompletion=(_step=_iterator.next()).done);_iteratorNormalCompletion=true){var modifier=_step.value;if(this._getModifier(modifier)){className+=" "+this._getClassNameWithoutModifiers()+this._getModifier(modifier)}}}catch(err){_didIteratorError=true;_iteratorError=err}finally{try{if(!_iteratorNormalCompletion&&_iterator.return!=null){_iterator.return()}}finally{if(_didIteratorError){throw _iteratorError}}}return className}},{key:"blockName",value:function blockName(){return this._blockName}},{key:"_getClassNameWithoutModifiers",value:function _getClassNameWithoutModifiers(){return this._elementName?"".concat(this._blockName,"__").concat(this._elementName):this._blockName}},{key:"_getModifier",value:function _getModifier(modifier){if(!this._modifiers.has(modifier)){return null}var modifierValue=this._modifiers.get(modifier);if(typetools_1.isBool(modifierValue)){return modifierValue?"_".concat(modifier):""}return"_".concat(modifier,"_").concat(modifierValue)}}]);return BemInfo}();exports.BemInfo=BemInfo;

},{"../../utils/typetools":56}],8:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var Disposable_1=require("../../disposable/Disposable");var BemInfo_1=require("./BemInfo");var TagsName_1=require("./TagsName");var stringutils_1=require("../../utils/stringutils");var Component=/*#__PURE__*/function(_Disposable_1$Disposa){_inherits(Component,_Disposable_1$Disposa);function Component(config){var _this;_classCallCheck(this,Component);_this=_possibleConstructorReturn(this,_getPrototypeOf(Component).call(this));_this._bemInfo=[];_this._baseElement=Component._initBaseElement(config.tagName,config.baseElement);if(config.blockName){_this._bemInfo.push(new BemInfo_1.BemInfo(config.blockName))}if(config.bemInfo){_this._bemInfo.push(config.bemInfo)}if(config.content){_this._baseElement.innerHTML=config.content}_this._invalidateClassName();return _this}_createClass(Component,[{key:"addChild",value:function addChild(component){var element=component instanceof Node?component:component.element();this._baseElement.appendChild(element)}},{key:"insertChild",value:function insertChild(component,position){var element=component instanceof Node?component:component.element();this._baseElement.insertBefore(element,this._baseElement.childNodes[position])}},{key:"removeChild",value:function removeChild(component){var element=component instanceof Node?component:component.element();this._baseElement.removeChild(element)}},{key:"setContent",value:function setContent(content){this._baseElement.innerHTML=content}},{key:"setTextContent",value:function setTextContent(text){this.addChild(document.createTextNode(text))}},{key:"removeChildren",value:function removeChildren(){var children=Array.from(this._baseElement.children);for(var _i=0;_i<children.length;_i++){var child=children[_i];this.removeChild(child)}}},{key:"focus",value:function focus(){this._baseElement.focus()}},{key:"blur",value:function blur(){this._baseElement.blur()}},{key:"eventTarget",value:function eventTarget(){return this._baseElement}},{key:"element",value:function element(){return this._baseElement}},{key:"width",value:function width(){return this._baseElement.offsetWidth}},{key:"height",value:function height(){return this._baseElement.offsetHeight}},{key:"x",value:function x(){return this._baseElement.offsetLeft}},{key:"y",value:function y(){return this._baseElement.offsetTop}},{key:"setWidth",value:function setWidth(width){this.setStyle("width","".concat(width,"px"))}},{key:"setHeight",value:function setHeight(height){this.setStyle("height","".concat(height,"px"))}},{key:"setX",value:function setX(width){this.setStyle("left","".concat(width,"px"))}},{key:"setY",value:function setY(height){this.setStyle("top","".concat(height,"px"))}},{key:"move",value:function move(position){this.setX(position.x);this.setY(position.y)}},{key:"getClientRect",value:function getClientRect(){return this._baseElement.getBoundingClientRect()}},{key:"applyStyles",value:function applyStyles(stylesList){for(var style in stylesList){this.setStyle(style,stylesList[style])}}},{key:"createChildBemInfo",value:function createChildBemInfo(elementName){return new BemInfo_1.BemInfo(this._bemInfo[0].blockName(),elementName)}},{key:"setStyle",value:function setStyle(style,value){var _this2=this;style=stringutils_1.toCamelCase(style);var setStyle=function setStyle(style,value){var styles=_this2._baseElement.style;styles[style]=value.toString()};var stylesToSet=[style];if(!this._baseElement.style.hasOwnProperty(style)){stylesToSet.push("Webkit"+style.substr(0,1).toUpperCase()+style.substr(1,style.length));stylesToSet.push("Moz"+style.substr(0,1).toUpperCase()+style.substr(1,style.length));stylesToSet.push("ms"+style.substr(0,1).toUpperCase()+style.substr(1,style.length));stylesToSet.push("O"+style.substr(0,1).toUpperCase()+style.substr(1,style.length))}for(var _i2=0;_i2<stylesToSet.length;_i2++){var _style=stylesToSet[_i2];setStyle(_style,value)}}},{key:"setAttribute",value:function setAttribute(atrName,atrValue){this._baseElement.setAttribute(atrName,atrValue)}},{key:"updateModifier",value:function updateModifier(modifier,value){this._bemInfo[0].updateModifier(modifier,value);this._invalidateClassName()}},{key:"addBemInfo",value:function addBemInfo(bemInfo){this._bemInfo.push(bemInfo);this._invalidateClassName()}},{key:"_invalidateClassName",value:function _invalidateClassName(){var className="";var _iteratorNormalCompletion=true;var _didIteratorError=false;var _iteratorError=undefined;try{for(var _iterator=this._bemInfo[Symbol.iterator](),_step;!(_iteratorNormalCompletion=(_step=_iterator.next()).done);_iteratorNormalCompletion=true){var bemInfo=_step.value;className+=className?" "+bemInfo.getClassName():bemInfo.getClassName()}}catch(err){_didIteratorError=true;_iteratorError=err}finally{try{if(!_iteratorNormalCompletion&&_iterator.return!=null){_iterator.return()}}finally{if(_didIteratorError){throw _iteratorError}}}this._baseElement.setAttribute("class",className)}}],[{key:"_initBaseElement",value:function _initBaseElement(tagName,baseElement){if(baseElement){return baseElement}if(tagName||!baseElement){tagName=tagName?tagName:TagsName_1.TagsName.div;return document.createElement(tagName)}throw new Error("Undefined behavior: tagName and baseElement is set")}}]);return Component}(Disposable_1.Disposable);exports.Component=Component;

},{"../../disposable/Disposable":42,"../../utils/stringutils":55,"./BemInfo":7,"./TagsName":9}],9:[function(require,module,exports){
"use strict";Object.defineProperty(exports,"__esModule",{value:true});var TagsName;(function(TagsName){TagsName["div"]="div";TagsName["span"]="span";TagsName["button"]="button";TagsName["img"]="img";TagsName["canvas"]="canvas";TagsName["input"]="input"})(TagsName||(TagsName={}));exports.TagsName=TagsName;

},{}],10:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var Component_1=require("../component/Component");var ToolView=/*#__PURE__*/function(_Component_1$Componen){_inherits(ToolView,_Component_1$Componen);function ToolView(_ref){var _this;var bemInfo=_ref.bemInfo,icon=_ref.icon,tool=_ref.tool;_classCallCheck(this,ToolView);_this=_possibleConstructorReturn(this,_getPrototypeOf(ToolView).call(this,{bemInfo:bemInfo,content:icon}));_this._activated=false;_this._tool=tool;return _this}_createClass(ToolView,[{key:"activated",value:function activated(){return this._activated}},{key:"reset",value:function reset(){this._tool.reset()}},{key:"activate",value:function activate(){this._tool.activate();this.updateModifier("selected",true);this._activated=true}},{key:"deactivate",value:function deactivate(){this._tool.deactivate();this.updateModifier("selected",false);this._activated=false}}]);return ToolView}(Component_1.Component);exports.ToolView=ToolView;

},{"../component/Component":8}],11:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}Object.defineProperty(exports,"__esModule",{value:true});var Component_1=require("../component/Component");var ChangeToolAction_1=require("./action/ChangeToolAction");var ToolView_1=require("./ToolView");var Toolbar=/*#__PURE__*/function(_Component_1$Componen){_inherits(Toolbar,_Component_1$Componen);function Toolbar(tools){var _this;_classCallCheck(this,Toolbar);_this=_possibleConstructorReturn(this,_getPrototypeOf(Toolbar).call(this,{blockName:"toolbar"}));_this._tools=[];_this._toolChangedEvent=_this._createEventDispatcher();_this._tools=tools.map(function(tool){var toolView=new ToolView_1.ToolView({icon:tool.icon(),tool:tool,bemInfo:_this.createChildBemInfo("tool")});_this._addDisposable(toolView);_this._listen("click",toolView,_this._onToolClickHandler.bind(_assertThisInitialized(_assertThisInitialized(_this)),toolView));_this.addChild(toolView);return toolView});return _this}_createClass(Toolbar,[{key:"activateFirstTool",value:function activateFirstTool(){this._tools.forEach(function(tool){return tool.deactivate()});this._tools[0].activate()}},{key:"toolChangedEvent",value:function toolChangedEvent(){return this._toolChangedEvent}},{key:"resetTools",value:function resetTools(){this._tools.forEach(function(tool){return tool.reset()})}},{key:"_onToolClickHandler",value:function _onToolClickHandler(tool){this._toolChangedEvent.dispatch(new ChangeToolAction_1.ChangeToolAction(this._tools,tool))}}]);return Toolbar}(Component_1.Component);exports.Toolbar=Toolbar;

},{"../component/Component":8,"./ToolView":10,"./action/ChangeToolAction":12}],12:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var ChangeToolAction=/*#__PURE__*/function(){function ChangeToolAction(tools,newTool){_classCallCheck(this,ChangeToolAction);this._tools=tools.filter(function(tool){return tool.activated()});this._newTool=newTool}_createClass(ChangeToolAction,[{key:"execute",value:function execute(){this._tools.forEach(function(tool){return tool.deactivate()});this._newTool.activate()}},{key:"unexecute",value:function unexecute(){this._newTool.deactivate();this._tools.forEach(function(tool){return tool.activate()})}}]);return ChangeToolAction}();exports.ChangeToolAction=ChangeToolAction;

},{}],13:[function(require,module,exports){
"use strict";function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _wrapNativeSuper(Class){var _cache=typeof Map==="function"?new Map:undefined;_wrapNativeSuper=function _wrapNativeSuper(Class){if(Class===null||!_isNativeFunction(Class))return Class;if(typeof Class!=="function"){throw new TypeError("Super expression must either be null or a function")}if(typeof _cache!=="undefined"){if(_cache.has(Class))return _cache.get(Class);_cache.set(Class,Wrapper)}function Wrapper(){return _construct(Class,arguments,_getPrototypeOf(this).constructor)}Wrapper.prototype=Object.create(Class.prototype,{constructor:{value:Wrapper,enumerable:false,writable:true,configurable:true}});return _setPrototypeOf(Wrapper,Class)};return _wrapNativeSuper(Class)}function isNativeReflectConstruct(){if(typeof Reflect==="undefined"||!Reflect.construct)return false;if(Reflect.construct.sham)return false;if(typeof Proxy==="function")return true;try{Date.prototype.toString.call(Reflect.construct(Date,[],function(){}));return true}catch(e){return false}}function _construct(Parent,args,Class){if(isNativeReflectConstruct()){_construct=Reflect.construct}else{_construct=function _construct(Parent,args,Class){var a=[null];a.push.apply(a,args);var Constructor=Function.bind.apply(Parent,a);var instance=new Constructor;if(Class)_setPrototypeOf(instance,Class.prototype);return instance}}return _construct.apply(null,arguments)}function _isNativeFunction(fn){return Function.toString.call(fn).indexOf("[native code]")!==-1}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}Object.defineProperty(exports,"__esModule",{value:true});var Disposable_1=require("../../disposable/Disposable");var ListenableWindow_1=require("../../disposable/ListenableWindow");var Vec2_1=require("../../utils/Vec2");var MouseEventData=/*#__PURE__*/function(_MouseEvent){_inherits(MouseEventData,_MouseEvent);function MouseEventData(){_classCallCheck(this,MouseEventData);return _possibleConstructorReturn(this,_getPrototypeOf(MouseEventData).apply(this,arguments))}return MouseEventData}(_wrapNativeSuper(MouseEvent));exports.MouseEventData=MouseEventData;var MouseEventDispatcher=/*#__PURE__*/function(_Disposable_1$Disposa){_inherits(MouseEventDispatcher,_Disposable_1$Disposa);function MouseEventDispatcher(component){var _this;_classCallCheck(this,MouseEventDispatcher);_this=_possibleConstructorReturn(this,_getPrototypeOf(MouseEventDispatcher).call(this));_this._shiftPressed=false;_this._ctrlPressed=false;_this._mouseDownEvent=_this._createEventDispatcher();_this._mouseUpEvent=_this._createEventDispatcher();_this._mouseMoveEvent=_this._createEventDispatcher();var listenableWindow=new ListenableWindow_1.ListenableWindow;_this._addDisposable(listenableWindow);var mouseDown=false;_this._listen("mousedown",component,function(event){mouseDown=true;_this._mouseDownEvent.dispatch(_this._getEventData(event,component))});_this._listen("mouseup",listenableWindow,function(event){if(mouseDown){_this._mouseUpEvent.dispatch(_this._getEventData(event,component))}mouseDown=false});_this._listen("mousemove",listenableWindow,function(event){_this._mouseMoveEvent.dispatch(_this._getEventData(event,component))});_this._listen("keydown",listenableWindow,function(ev){var event=ev;_this._ctrlPressed=_this._ctrlPressed||event.key=="Control";_this._shiftPressed=_this._shiftPressed||event.key=="Shift"});_this._listen("keyup",listenableWindow,function(ev){var event=ev;_this._ctrlPressed=_this._ctrlPressed&&event.key!="Control";_this._shiftPressed=_this._shiftPressed&&event.key!="Shift"});return _this}_createClass(MouseEventDispatcher,[{key:"mouseDownEvent",value:function mouseDownEvent(){return this._mouseDownEvent}},{key:"mouseUpEvent",value:function mouseUpEvent(){return this._mouseUpEvent}},{key:"mouseMoveEvent",value:function mouseMoveEvent(){return this._mouseMoveEvent}},{key:"_getEventData",value:function _getEventData(event,component){return Object.assign({},event,{shiftKey:this._shiftPressed,ctrlKey:this._ctrlPressed,relativeCords:this._getRelativeCords(event,component),absoluteCords:new Vec2_1.Vec2(event.clientX,event.clientY)})}},{key:"_getRelativeCords",value:function _getRelativeCords(event,component){var boundingBox=component.getClientRect();return new Vec2_1.Vec2(event.clientX-boundingBox.left,event.clientY-boundingBox.top)}}]);return MouseEventDispatcher}(Disposable_1.Disposable);exports.MouseEventDispatcher=MouseEventDispatcher;

},{"../../disposable/Disposable":42,"../../disposable/ListenableWindow":45,"../../utils/Vec2":53}],14:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _toConsumableArray(arr){return _arrayWithoutHoles(arr)||_iterableToArray(arr)||_nonIterableSpread()}function _nonIterableSpread(){throw new TypeError("Invalid attempt to spread non-iterable instance")}function _iterableToArray(iter){if(Symbol.iterator in Object(iter)||Object.prototype.toString.call(iter)==="[object Arguments]")return Array.from(iter)}function _arrayWithoutHoles(arr){if(Array.isArray(arr)){for(var i=0,arr2=new Array(arr.length);i<arr.length;i++){arr2[i]=arr[i]}return arr2}}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var Disposable_1=require("../../disposable/Disposable");var Iterator_1=require("../../iterator/Iterator");var ShapesHolder=/*#__PURE__*/function(_Disposable_1$Disposa){_inherits(ShapesHolder,_Disposable_1$Disposa);function ShapesHolder(){var _this;_classCallCheck(this,ShapesHolder);_this=_possibleConstructorReturn(this,_getPrototypeOf(ShapesHolder).apply(this,arguments));_this._shapes=new Set;_this._changeEvent=_this._createEventDispatcher();return _this}_createClass(ShapesHolder,[{key:"changeEvent",value:function changeEvent(){return this._changeEvent}},{key:"add",value:function add(shape){var _this2=this;this._shapes.add(shape);this._addHandler(shape.changeEvent(),function(){return _this2._changeEvent.dispatch()});this._changeEvent.dispatch()}},{key:"delete",value:function _delete(shape){this._removeDependency(shape);this._shapes.delete(shape);this._changeEvent.dispatch()}},{key:"clear",value:function clear(){this._shapes.clear();this._changeEvent.dispatch()}},{key:"getShape",value:function getShape(cord){var shapes=Array.apply(void 0,_toConsumableArray(this._shapes)).reverse();var _iteratorNormalCompletion=true;var _didIteratorError=false;var _iteratorError=undefined;try{for(var _iterator=shapes[Symbol.iterator](),_step;!(_iteratorNormalCompletion=(_step=_iterator.next()).done);_iteratorNormalCompletion=true){var shape=_step.value;if(shape.owns(cord)){return shape}}}catch(err){_didIteratorError=true;_iteratorError=err}finally{try{if(!_iteratorNormalCompletion&&_iterator.return!=null){_iterator.return()}}finally{if(_didIteratorError){throw _iteratorError}}}return null}},{key:Symbol.iterator,value:function value(){return new Iterator_1.Iterator(this._shapes)}}]);return ShapesHolder}(Disposable_1.Disposable);exports.ShapesHolder=ShapesHolder;

},{"../../disposable/Disposable":42,"../../iterator/Iterator":48}],15:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _toConsumableArray(arr){return _arrayWithoutHoles(arr)||_iterableToArray(arr)||_nonIterableSpread()}function _nonIterableSpread(){throw new TypeError("Invalid attempt to spread non-iterable instance")}function _iterableToArray(iter){if(Symbol.iterator in Object(iter)||Object.prototype.toString.call(iter)==="[object Arguments]")return Array.from(iter)}function _arrayWithoutHoles(arr){if(Array.isArray(arr)){for(var i=0,arr2=new Array(arr.length);i<arr.length;i++){arr2[i]=arr[i]}return arr2}}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}Object.defineProperty(exports,"__esModule",{value:true});var Component_1=require("../component/Component");var TagsName_1=require("../component/TagsName");var CanvasDrawingContext_1=require("./drawingcontext/CanvasDrawingContext");var MouseEventDispatcher_1=require("./MouseEventDispatcher");var ResizeObserver_1=require("../../utils/ResizeObserver");var ShapesHolder_1=require("./ShapesHolder");var ToolFactory_1=require("./tools/ToolFactory");var Workplace=/*#__PURE__*/function(_Component_1$Componen){_inherits(Workplace,_Component_1$Componen);function Workplace(toolsCreator){var _this2;var _this;_classCallCheck(this,Workplace);_this=_possibleConstructorReturn(this,_getPrototypeOf(Workplace).call(this,{blockName:"workplace"}));_this._shapesHolder=new ShapesHolder_1.ShapesHolder;_this._background=new Component_1.Component({tagName:TagsName_1.TagsName.img,bemInfo:_this.createChildBemInfo("background")});_this.addChild(_this._background);_this._background.setStyle("display","none");var _this$_createCanvas=_this._createCanvas("results-canvas"),resultsCanvasContext=_this$_createCanvas.context;_this._resultsCanvasContext=resultsCanvasContext;var _this$_createCanvas2=_this._createCanvas("working-canvas"),workingCanvasContext=_this$_createCanvas2.context,workingCanvas=_this$_createCanvas2.canvas;_this._workingCanvasContext=workingCanvasContext;var canvasMouseEventDispatcher=new MouseEventDispatcher_1.MouseEventDispatcher(workingCanvas);_this._addDisposable(canvasMouseEventDispatcher);_this._addDisposable(_this._shapesHolder);_this._addHandler(_this._shapesHolder.changeEvent(),function(){return _this._invalidateResultCanvas()});var toolFactory=new ToolFactory_1.ToolFactory({canvasMouseEventDispatcher:canvasMouseEventDispatcher,canvasContext:_this._workingCanvasContext,shapesHolder:_this._shapesHolder,workplaceContainer:_assertThisInitialized(_assertThisInitialized(_this))});_this._tools=toolsCreator.createTools(toolFactory);_this._tools.forEach(function(tool){_this._addDisposable(tool);_this._addHandler(tool.activatedEvent(),function(){_this.setStyle("cursor",tool.cursor())})});var actionEventDispatchers=_this._tools.map(function(tool){return tool.actionCreatedEvent()});_this._actionCreatedEvent=(_this2=_this)._createEventDispatcher.apply(_this2,_toConsumableArray(actionEventDispatchers));return _this}_createClass(Workplace,[{key:"actionCreatedEvent",value:function actionCreatedEvent(){return this._actionCreatedEvent}},{key:"tools",value:function tools(){return this._tools}},{key:"setBackgroundImage",value:function setBackgroundImage(src){if(src){this._background.setStyle("display","");this._background.setAttribute("src",src)}else{this._background.setStyle("display","none")}}},{key:"getSerializedShapes",value:function getSerializedShapes(predicate){var data=[];var _iteratorNormalCompletion=true;var _didIteratorError=false;var _iteratorError=undefined;try{for(var _iterator=this._shapesHolder[Symbol.iterator](),_step;!(_iteratorNormalCompletion=(_step=_iterator.next()).done);_iteratorNormalCompletion=true){var shape=_step.value;(!predicate||predicate(shape))&&data.push(shape.serialize())}}catch(err){_didIteratorError=true;_iteratorError=err}finally{try{if(!_iteratorNormalCompletion&&_iterator.return!=null){_iterator.return()}}finally{if(_didIteratorError){throw _iteratorError}}}return JSON.stringify(data)}},{key:"clean",value:function clean(){this._shapesHolder.clear();this._workingCanvasContext.clean();this._resultsCanvasContext.clean()}},{key:"_createCanvas",value:function _createCanvas(elementName){var canvas=new Component_1.Component({tagName:TagsName_1.TagsName.canvas,bemInfo:this.createChildBemInfo(elementName)});this.addChild(canvas);var canvasElement=canvas.element();var canvasResizeObserver=new ResizeObserver_1.ResizeObserver(canvas);this._addDisposable(canvasResizeObserver);this._addHandler(canvasResizeObserver.resizeEvent(),function(){requestAnimationFrame(function(){var canvasRect=canvasElement.getBoundingClientRect();canvasElement.width=canvasRect.width;canvasElement.height=canvasRect.height})});return{context:new CanvasDrawingContext_1.CanvasDrawingContext(canvasElement),canvas:canvas}}},{key:"_invalidateResultCanvas",value:function _invalidateResultCanvas(){this._resultsCanvasContext.clean();var _iteratorNormalCompletion2=true;var _didIteratorError2=false;var _iteratorError2=undefined;try{for(var _iterator2=this._shapesHolder[Symbol.iterator](),_step2;!(_iteratorNormalCompletion2=(_step2=_iterator2.next()).done);_iteratorNormalCompletion2=true){var shape=_step2.value;shape.draw(this._resultsCanvasContext)}}catch(err){_didIteratorError2=true;_iteratorError2=err}finally{try{if(!_iteratorNormalCompletion2&&_iterator2.return!=null){_iterator2.return()}}finally{if(_didIteratorError2){throw _iteratorError2}}}}}]);return Workplace}(Component_1.Component);exports.Workplace=Workplace;

},{"../../utils/ResizeObserver":50,"../component/Component":8,"../component/TagsName":9,"./MouseEventDispatcher":13,"./ShapesHolder":14,"./drawingcontext/CanvasDrawingContext":18,"./tools/ToolFactory":25}],16:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var AddShapeAction=/*#__PURE__*/function(){function AddShapeAction(shapes,newShapes){_classCallCheck(this,AddShapeAction);this._shapes=shapes;this._newShape=newShapes}_createClass(AddShapeAction,[{key:"execute",value:function execute(){this._shapes.add(this._newShape)}},{key:"unexecute",value:function unexecute(){this._shapes.delete(this._newShape)}}]);return AddShapeAction}();exports.AddShapeAction=AddShapeAction;

},{}],17:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var SelectAction=/*#__PURE__*/function(){function SelectAction(shape){_classCallCheck(this,SelectAction);this._shape=shape;this._selected=this._shape.selected()}_createClass(SelectAction,[{key:"execute",value:function execute(){this._shape.setSelected(!this._selected)}},{key:"unexecute",value:function unexecute(){this._shape.setSelected(this._selected)}}]);return SelectAction}();exports.SelectAction=SelectAction;

},{}],18:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var Vec2_1=require("../../../utils/Vec2");var CanvasDrawingContext=/*#__PURE__*/function(){function CanvasDrawingContext(canvasElement){_classCallCheck(this,CanvasDrawingContext);this._context=canvasElement.getContext("2d");this._context.textBaseline="middle";this._canvasElement=canvasElement}_createClass(CanvasDrawingContext,[{key:"setFill",value:function setFill(color){if(this._context.fillStyle!=color){this._context.fillStyle=color}}},{key:"setStroke",value:function setStroke(color){if(this._context.strokeStyle!=color){this._context.strokeStyle=color}}},{key:"setFont",value:function setFont(font){if(this._context.font!=font){this._context.font=font}}},{key:"setStrokeWidth",value:function setStrokeWidth(width){if(this._context.lineWidth!=width){this._context.lineWidth=width}}},{key:"setTextAlign",value:function setTextAlign(align){if(this._context.textAlign!=align){this._context.textAlign=align}}},{key:"beginPath",value:function beginPath(){this._context.beginPath()}},{key:"closePath",value:function closePath(){this._context.closePath()}},{key:"stroke",value:function stroke(){this._context.stroke()}},{key:"fill",value:function fill(){this._context.fill()}},{key:"moveTo",value:function moveTo(vec){this._context.moveTo(vec.x,vec.y)}},{key:"lineTo",value:function lineTo(vec){this._context.lineTo(vec.x,vec.y)}},{key:"arc",value:function arc(center,radius,startAngle,angle){this._context.arc(center.x,center.y,radius,startAngle,startAngle+angle,false)}},{key:"rect",value:function rect(_rect){this._context.rect(_rect.x,_rect.y,_rect.width,_rect.height)}},{key:"clean",value:function clean(rect){if(rect){this._context.clearRect(rect.x,rect.y,rect.width,rect.height)}else{this._context.clearRect(0,0,this._canvasElement.width,this._canvasElement.height)}}},{key:"text",value:function text(str,pos1){var pos2=arguments.length>2&&arguments[2]!==undefined?arguments[2]:pos1;var dirVec=new Vec2_1.Vec2(pos2.x-pos1.x,pos2.y-pos1.y);this._context.save();this._context.translate(pos1.x,pos1.y+dirVec.y/2);this._context.rotate(dirVec.angle());this._context.fillText(str,-dirVec.x/2,-dirVec.y/2);this._context.restore()}}]);return CanvasDrawingContext}();exports.CanvasDrawingContext=CanvasDrawingContext;

},{"../../../utils/Vec2":53}],19:[function(require,module,exports){
"use strict";Object.defineProperty(exports,"__esModule",{value:true});var TextAlign;(function(TextAlign){TextAlign["left"]="left";TextAlign["right"]="right";TextAlign["center"]="center"})(TextAlign||(TextAlign={}));exports.TextAlign=TextAlign;

},{}],20:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var Vec2_1=require("../../../utils/Vec2");var TextAlign_1=require("../drawingcontext/TextAlign");var DrawingParams_1=require("./DrawingParams");var METRICS_SCALE=0.25;var AnnotationDrawer=/*#__PURE__*/function(){function AnnotationDrawer(){_classCallCheck(this,AnnotationDrawer)}_createClass(AnnotationDrawer,null,[{key:"drawLabel",value:function drawLabel(context,label,position){context.setFont(DrawingParams_1.DrawingParams.font());context.setFill(DrawingParams_1.DrawingParams.textFill());context.text(label,position)}},{key:"drawLineAnnotation",value:function drawLineAnnotation(context,line){var textTranslate=25;var dirVector=AnnotationDrawer._getLineDir(line);var length=AnnotationDrawer._getLineLength(dirVector);dirVector.scale(textTranslate/dirVector.radius());var textPosition=line.end().add(dirVector);context.setTextAlign(TextAlign_1.TextAlign.center);AnnotationDrawer.drawLabel(context,length.toString(),textPosition)}},{key:"_getLineLength",value:function _getLineLength(line){return Math.floor(line.radius()*METRICS_SCALE)}},{key:"_getLineDir",value:function _getLineDir(line){var start=line.start();var end=line.end();return new Vec2_1.Vec2(end.x-start.x,end.y-start.y)}}]);return AnnotationDrawer}();exports.AnnotationDrawer=AnnotationDrawer;

},{"../../../utils/Vec2":53,"../drawingcontext/TextAlign":19,"./DrawingParams":24}],21:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var Disposable_1=require("../../../disposable/Disposable");var BaseShape=/*#__PURE__*/function(_Disposable_1$Disposa){_inherits(BaseShape,_Disposable_1$Disposa);function BaseShape(){var _this;_classCallCheck(this,BaseShape);_this=_possibleConstructorReturn(this,_getPrototypeOf(BaseShape).apply(this,arguments));_this._selected=false;_this._changeEvent=_this._createEventDispatcher();return _this}_createClass(BaseShape,[{key:"setSelected",value:function setSelected(selected){this._selected=selected;this._changeEvent.dispatch()}},{key:"selected",value:function selected(){return this._selected}},{key:"changeEvent",value:function changeEvent(){return this._changeEvent}}]);return BaseShape}(Disposable_1.Disposable);exports.BaseShape=BaseShape;

},{"../../../disposable/Disposable":42}],22:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var Disposable_1=require("../../../disposable/Disposable");var BaseTool=/*#__PURE__*/function(_Disposable_1$Disposa){_inherits(BaseTool,_Disposable_1$Disposa);function BaseTool(drawingContext,mouseEventDispatcher){var _this;_classCallCheck(this,BaseTool);_this=_possibleConstructorReturn(this,_getPrototypeOf(BaseTool).call(this));_this._activated=false;_this._actionCreatedEvent=_this._createEventDispatcher();_this._activatedEvent=_this._createEventDispatcher();_this._drawingContext=drawingContext;_this._addHandler(mouseEventDispatcher.mouseDownEvent(),function(data){return _this._activated&&_this._mouseDownHandler(data)});_this._addHandler(mouseEventDispatcher.mouseMoveEvent(),function(data){return _this._activated&&_this._mouseMoveHandler(data)});_this._addHandler(mouseEventDispatcher.mouseUpEvent(),function(data){return _this._activated&&_this._mouseUpHandler(data)});return _this}_createClass(BaseTool,[{key:"actionCreatedEvent",value:function actionCreatedEvent(){return this._actionCreatedEvent}},{key:"activatedEvent",value:function activatedEvent(){return this._activatedEvent}},{key:"activate",value:function activate(){this._activated=true;this._activatedEvent.dispatch()}},{key:"deactivate",value:function deactivate(){this._activated=false;this.reset()}},{key:"reset",value:function reset(){}},{key:"_mouseDownHandler",value:function _mouseDownHandler(data){}},{key:"_mouseUpHandler",value:function _mouseUpHandler(data){}},{key:"_mouseMoveHandler",value:function _mouseMoveHandler(data){}},{key:"_dispatchActionCreatedEvent",value:function _dispatchActionCreatedEvent(action){this._actionCreatedEvent.dispatch(action)}}]);return BaseTool}(Disposable_1.Disposable);exports.BaseTool=BaseTool;

},{"../../../disposable/Disposable":42}],23:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var BaseTool_1=require("./BaseTool");var AddShapeAction_1=require("../action/AddShapeAction");var DrawTool=/*#__PURE__*/function(_BaseTool_1$BaseTool){_inherits(DrawTool,_BaseTool_1$BaseTool);function DrawTool(drawingContext,mouseEventDispatcher,shapes){var _this;_classCallCheck(this,DrawTool);_this=_possibleConstructorReturn(this,_getPrototypeOf(DrawTool).call(this,drawingContext,mouseEventDispatcher));_this._shapes=shapes;return _this}_createClass(DrawTool,[{key:"cursor",value:function cursor(){return"crosshair"}},{key:"_dispatchAddShapeEvent",value:function _dispatchAddShapeEvent(shape){this._dispatchActionCreatedEvent(new AddShapeAction_1.AddShapeAction(this._shapes,shape))}}]);return DrawTool}(BaseTool_1.BaseTool);exports.DrawTool=DrawTool;

},{"../action/AddShapeAction":16,"./BaseTool":22}],24:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var DrawingParams=new(/*#__PURE__*/function(){function _class(){_classCallCheck(this,_class)}_createClass(_class,[{key:"linesColor",value:function linesColor(){return"#555555"}},{key:"selectedLinesColor",value:function selectedLinesColor(){return"#AD731D"}},{key:"linesWidth",value:function linesWidth(){return 2}},{key:"eraserColor",value:function eraserColor(){return"#E5E5E5"}},{key:"eraserBorderColor",value:function eraserBorderColor(){return"#B7B7B7"}},{key:"eraserBorderWidth",value:function eraserBorderWidth(){return 3}},{key:"eraserSize",value:function eraserSize(){return 20}},{key:"eraserCornerRounding",value:function eraserCornerRounding(){return 4}},{key:"font",value:function font(){return"normal 24px Helvetica"}},{key:"textFill",value:function textFill(){return"#343434"}}]);return _class}());exports.DrawingParams=DrawingParams;

},{}],25:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var LineTool_1=require("./line/LineTool");var DotTool_1=require("./dot/DotTool");var CompassTool_1=require("./compass/CompassTool");var EraserTool_1=require("./eraser/EraserTool");var SelectTool_1=require("./select/SelectTool");var ToolFactory=/*#__PURE__*/function(){function ToolFactory(_ref){var canvasContext=_ref.canvasContext,canvasMouseEventDispatcher=_ref.canvasMouseEventDispatcher,shapesHolder=_ref.shapesHolder,workplaceContainer=_ref.workplaceContainer;_classCallCheck(this,ToolFactory);this._canvasContext=canvasContext;this._mouseEventDispatcher=canvasMouseEventDispatcher;this._shapesHolder=shapesHolder;this._workplaceContainer=workplaceContainer}_createClass(ToolFactory,[{key:"createLineTool",value:function createLineTool(){return new LineTool_1.LineTool(this._canvasContext,this._mouseEventDispatcher,this._shapesHolder)}},{key:"createDotTool",value:function createDotTool(){return new DotTool_1.DotTool(this._canvasContext,this._mouseEventDispatcher,this._shapesHolder,this._workplaceContainer)}},{key:"createCompassTool",value:function createCompassTool(){return new CompassTool_1.CompassTool(this._canvasContext,this._mouseEventDispatcher,this._shapesHolder)}},{key:"createEraserTool",value:function createEraserTool(){return new EraserTool_1.EraserTool(this._canvasContext,this._mouseEventDispatcher,this._shapesHolder)}},{key:"createSelectTool",value:function createSelectTool(){return new SelectTool_1.SelectTool(this._canvasContext,this._mouseEventDispatcher,this._shapesHolder)}}]);return ToolFactory}();exports.ToolFactory=ToolFactory;

},{"./compass/CompassTool":27,"./dot/DotTool":32,"./eraser/EraserTool":37,"./line/LineTool":39,"./select/SelectTool":40}],26:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var Vec2_1=require("../../../../utils/Vec2");var mathutils_1=require("../../../../utils/mathutils");var DrawingParams_1=require("../DrawingParams");var BaseShape_1=require("../BaseShape");var Arc=/*#__PURE__*/function(_BaseShape_1$BaseShap){_inherits(Arc,_BaseShape_1$BaseShap);function Arc(center,arcStartPoint,arcEndPoint){var _this;_classCallCheck(this,Arc);_this=_possibleConstructorReturn(this,_getPrototypeOf(Arc).call(this));_this._angle=0;_this._radius=0;_this._startAngle=0;_this._center=center;var angleStartVec=new Vec2_1.Vec2(arcStartPoint.x-_this._center.x,arcStartPoint.y-_this._center.y);_this._startAngle=angleStartVec.angle();_this._radius=angleStartVec.radius();var angleEndVec=new Vec2_1.Vec2(arcEndPoint.x-_this._center.x,arcEndPoint.y-_this._center.y);_this._angle=angleEndVec.angle()-_this._startAngle;_this._angle=_this._angle<0?_this._angle+Math.PI*2:_this._angle;return _this}_createClass(Arc,[{key:"owns",value:function owns(cord){cord=cord.clone().reduce(this._center);var accuracy=1;var arcStart=new Vec2_1.Vec2(this._radius*Math.cos(this._startAngle),this._radius*Math.sin(this._startAngle));var arcEnd=new Vec2_1.Vec2(this._radius*Math.cos(this._startAngle+this._angle),this._radius*Math.sin(this._startAngle+this._angle));return cord.x*arcStart.y-cord.y*arcStart.x<0&&cord.x*arcEnd.y-cord.y*arcEnd.x>0&&cord.x*cord.x+cord.y*cord.y<(this._radius+accuracy)*(this._radius+accuracy)&&cord.x*cord.x+cord.y*cord.y>(this._radius-accuracy)*(this._radius-accuracy)}},{key:"center",value:function center(){return this._center.clone()}},{key:"radius",value:function radius(){return this._radius}},{key:"startAngle",value:function startAngle(){return this._startAngle}},{key:"angle",value:function angle(){return this._angle}},{key:"setArcEndVec",value:function setArcEndVec(vec){if(vec.angle()<this._startAngle+this._angle&&vec.angle()>this._startAngle||this._startAngle>mathutils_1.normalizeAngle(this._startAngle+this._angle)&&vec.angle()<mathutils_1.normalizeAngle(this._startAngle+this._angle)){return}var startAngleDelta=this._startAngle-vec.angle();startAngleDelta=startAngleDelta<0?startAngleDelta+Math.PI*2:startAngleDelta;var endAngleDelta=vec.angle()-(this._startAngle+this._angle);endAngleDelta=endAngleDelta<0?endAngleDelta+Math.PI*2:endAngleDelta;if(startAngleDelta<endAngleDelta){this._startAngle=mathutils_1.normalizeAngle(this._startAngle-startAngleDelta);this._angle=Math.max(this._angle,this._angle+startAngleDelta)}else{this._angle=Math.max(this._angle,this._angle+endAngleDelta)}}},{key:"draw",value:function draw(drawingContext){drawingContext.setStroke(this.selected()?DrawingParams_1.DrawingParams.selectedLinesColor():DrawingParams_1.DrawingParams.linesColor());drawingContext.setStrokeWidth(DrawingParams_1.DrawingParams.linesWidth());drawingContext.beginPath();drawingContext.arc(this.center(),this.radius(),this.startAngle(),this.angle());drawingContext.stroke()}},{key:"serialize",value:function serialize(){return{model:"arc",data:{center:this.center(),angle:this.angle(),radius:this.radius(),startAngle:this.startAngle()}}}}]);return Arc}(BaseShape_1.BaseShape);exports.Arc=Arc;

},{"../../../../utils/Vec2":53,"../../../../utils/mathutils":54,"../BaseShape":21,"../DrawingParams":24}],27:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var DrawTool_1=require("../DrawTool");var NullState_1=require("./NullState");var Icons_1=require("../../../Icons");var CompassTool=/*#__PURE__*/function(_DrawTool_1$DrawTool){_inherits(CompassTool,_DrawTool_1$DrawTool);function CompassTool(){var _this;_classCallCheck(this,CompassTool);_this=_possibleConstructorReturn(this,_getPrototypeOf(CompassTool).apply(this,arguments));_this._currentState=new NullState_1.NullState;return _this}_createClass(CompassTool,[{key:"icon",value:function icon(){return Icons_1.Icons.compass()}},{key:"reset",value:function reset(){this._currentState=new NullState_1.NullState;this._drawingContext.clean()}},{key:"_mouseDownHandler",value:function _mouseDownHandler(data){var newState=this._currentState.mouseDownHandler(data.relativeCords);if(newState){this._currentState=newState}else{var arc=this._currentState.arc();if(!arc){throw new Error("Invalid result tool for compass")}this._dispatchAddShapeEvent(arc);this.reset()}this._currentState.redrawState(this._drawingContext)}},{key:"_mouseMoveHandler",value:function _mouseMoveHandler(data){this._currentState.mouseMoveHandler(data.relativeCords);this._currentState.redrawState(this._drawingContext)}}]);return CompassTool}(DrawTool_1.DrawTool);exports.CompassTool=CompassTool;

},{"../../../Icons":6,"../DrawTool":23,"./NullState":30}],28:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var Line_1=require("../line/Line");var Arc_1=require("./Arc");var Vec2_1=require("../../../../utils/Vec2");var GetAngleState=/*#__PURE__*/function(){function GetAngleState(arcCenterCords,arcStartCord){_classCallCheck(this,GetAngleState);this._line=new Line_1.Line(arcCenterCords,arcStartCord);this._arc=new Arc_1.Arc(arcCenterCords,arcStartCord,arcStartCord)}_createClass(GetAngleState,[{key:"mouseDownHandler",value:function mouseDownHandler(cord){return null}},{key:"mouseMoveHandler",value:function mouseMoveHandler(cord){var arcCenter=this._arc.center();var mousePointer=new Vec2_1.Vec2(cord.x-arcCenter.x,cord.y-arcCenter.y);var radiusScale=this._arc.radius()/mousePointer.radius();mousePointer.x*=radiusScale;mousePointer.y*=radiusScale;this._arc.setArcEndVec(mousePointer);this._line.setEnd(new Vec2_1.Vec2(mousePointer.x+arcCenter.x,mousePointer.y+arcCenter.y))}},{key:"line",value:function line(){return this._line}},{key:"arc",value:function arc(){return this._arc}},{key:"redrawState",value:function redrawState(drawingContext){drawingContext.clean();this._line.draw(drawingContext);this._arc.draw(drawingContext)}}]);return GetAngleState}();exports.GetAngleState=GetAngleState;

},{"../../../../utils/Vec2":53,"../line/Line":38,"./Arc":26}],29:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var Line_1=require("../line/Line");var GetAngleState_1=require("./GetAngleState");var AnnotationDrawer_1=require("../AnnotationDrawer");var GetRadiusState=/*#__PURE__*/function(){function GetRadiusState(arcCenterCords){_classCallCheck(this,GetRadiusState);this._line=new Line_1.Line(arcCenterCords,arcCenterCords)}_createClass(GetRadiusState,[{key:"mouseDownHandler",value:function mouseDownHandler(cord){return new GetAngleState_1.GetAngleState(this._line.start(),this._line.end())}},{key:"mouseMoveHandler",value:function mouseMoveHandler(cord){this._line.setEnd(cord)}},{key:"line",value:function line(){return this._line}},{key:"arc",value:function arc(){return null}},{key:"redrawState",value:function redrawState(drawingContext){drawingContext.clean();this._line.draw(drawingContext);AnnotationDrawer_1.AnnotationDrawer.drawLineAnnotation(drawingContext,this._line)}}]);return GetRadiusState}();exports.GetRadiusState=GetRadiusState;

},{"../AnnotationDrawer":20,"../line/Line":38,"./GetAngleState":28}],30:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var GetRadiusState_1=require("./GetRadiusState");var NullState=/*#__PURE__*/function(){function NullState(){_classCallCheck(this,NullState)}_createClass(NullState,[{key:"mouseDownHandler",value:function mouseDownHandler(cords){return new GetRadiusState_1.GetRadiusState(cords)}},{key:"mouseMoveHandler",value:function mouseMoveHandler(){}},{key:"arc",value:function arc(){return null}},{key:"line",value:function line(){return null}},{key:"redrawState",value:function redrawState(drawingContext){drawingContext.clean()}}]);return NullState}();exports.NullState=NullState;

},{"./GetRadiusState":29}],31:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var DOT_RADIUS=4;var Dot=/*#__PURE__*/function(){function Dot(position){_classCallCheck(this,Dot);this._position=position}_createClass(Dot,[{key:"owns",value:function owns(cord){cord=cord.clone().reduce(this._position);var accuracy=5;return cord.x*cord.x+cord.y*cord.y<accuracy*accuracy}},{key:"position",value:function position(){return this._position}},{key:"draw",value:function draw(drawingContext){drawingContext.beginPath();drawingContext.arc(this._position,DOT_RADIUS,0,Math.PI*2);drawingContext.fill();drawingContext.closePath()}}]);return Dot}();exports.Dot=Dot;

},{}],32:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var DrawTool_1=require("../DrawTool");var Dot_1=require("./Dot");var LabeledDot_1=require("./LabeledDot");var Vec2_1=require("../../../../utils/Vec2");var Icons_1=require("../../../Icons");var LabelInput_1=require("./LabelInput");var LABEL_PADDING=new Vec2_1.Vec2(0,-15);var DotTool=/*#__PURE__*/function(_DrawTool_1$DrawTool){_inherits(DotTool,_DrawTool_1$DrawTool);function DotTool(drawingContext,eventDispatcher,shapes,workPlace){var _this;_classCallCheck(this,DotTool);_this=_possibleConstructorReturn(this,_getPrototypeOf(DotTool).call(this,drawingContext,eventDispatcher,shapes));_this._labelInput=new LabelInput_1.LabelInput(workPlace);_this._addDisposable(_this._labelInput);return _this}_createClass(DotTool,[{key:"icon",value:function icon(){return Icons_1.Icons.dot()}},{key:"reset",value:function reset(){this._removeDependency(this._labelInput);this._drawingContext.clean();this._labelInput.hide();this._dot=null}},{key:"_mouseUpHandler",value:function _mouseUpHandler(_ref){var _this2=this;var relativeCords=_ref.relativeCords;this._dot=new Dot_1.Dot(relativeCords);this._dot.draw(this._drawingContext);var labelPosition=relativeCords.clone().add(LABEL_PADDING);this._labelInput.show(labelPosition);this._addHandlerCallOnce(this._labelInput.inputEndEvent(),function(label){_this2._dispatchAddShapeEvent(new LabeledDot_1.LabeledDot(_this2._dot,label));_this2.reset()})}}]);return DotTool}(DrawTool_1.DrawTool);exports.DotTool=DotTool;

},{"../../../../utils/Vec2":53,"../../../Icons":6,"../DrawTool":23,"./Dot":31,"./LabelInput":34,"./LabeledDot":35}],33:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var Label=/*#__PURE__*/function(){function Label(position,label){_classCallCheck(this,Label);this._position=position;this._label=label}_createClass(Label,[{key:"position",value:function position(){return this._position}},{key:"label",value:function label(){return this._label}}]);return Label}();exports.Label=Label;

},{}],34:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _get(target,property,receiver){if(typeof Reflect!=="undefined"&&Reflect.get){_get=Reflect.get}else{_get=function _get(target,property,receiver){var base=_superPropBase(target,property);if(!base)return;var desc=Object.getOwnPropertyDescriptor(base,property);if(desc.get){return desc.get.call(receiver)}return desc.value}}return _get(target,property,receiver||target)}function _superPropBase(object,property){while(!Object.prototype.hasOwnProperty.call(object,property)){object=_getPrototypeOf(object);if(object===null)break}return object}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}Object.defineProperty(exports,"__esModule",{value:true});var Component_1=require("../../../component/Component");var TagsName_1=require("../../../component/TagsName");var Vec2_1=require("../../../../utils/Vec2");var DrawingParams_1=require("../DrawingParams");var Label_1=require("./Label");var ListenableWindow_1=require("../../../../disposable/ListenableWindow");var LabelInput=/*#__PURE__*/function(_Component_1$Componen){_inherits(LabelInput,_Component_1$Componen);function LabelInput(parent){var _this;_classCallCheck(this,LabelInput);_this=_possibleConstructorReturn(this,_getPrototypeOf(LabelInput).call(this,{tagName:TagsName_1.TagsName.input,blockName:"label-input"}));_this._visible=false;_this._inputEndEvent=_this._createEventDispatcher();_this.setAttribute("type","text");_this.applyStyles({"color":DrawingParams_1.DrawingParams.textFill(),"font":DrawingParams_1.DrawingParams.font()});_this._parent=parent;_this._listen("keydown",_assertThisInitialized(_assertThisInitialized(_this)),function(event){return _this._keyDownHandler(event)});_this._listen("focusout",_assertThisInitialized(_assertThisInitialized(_this)),function(){return _this.focus()});_this._listen("mousedown",new ListenableWindow_1.ListenableWindow,function(){return _this._dispatchInputEvent()});_this._listen("scroll",parent,function(){return _this.element().scrollLeft=0});return _this}_createClass(LabelInput,[{key:"inputEndEvent",value:function inputEndEvent(){return this._inputEndEvent}},{key:"show",value:function show(position){this._visible=true;this._clearData();this.move(position);this._parent.addChild(this);this.focus()}},{key:"hide",value:function hide(){this._visible=false;this.blur();this.element().parentNode&&this._parent.removeChild(this)}},{key:"createLabel",value:function createLabel(){return new Label_1.Label(new Vec2_1.Vec2(this.x(),this.y()),this._getInputElement().value)}},{key:"focus",value:function focus(){this._visible&&_get(_getPrototypeOf(LabelInput.prototype),"focus",this).call(this)}},{key:"_destruct",value:function _destruct(){_get(_getPrototypeOf(LabelInput.prototype),"_destruct",this).call(this);this._visible&&this._parent.removeChild(this.element())}},{key:"_keyDownHandler",value:function _keyDownHandler(event){var isSymbol=/(^[\w -]$)/.test(event.key);if(event.ctrlKey&&isSymbol||event.key=="Enter"){this._dispatchInputEvent()}}},{key:"_clearData",value:function _clearData(){return this._getInputElement().value=""}},{key:"_dispatchInputEvent",value:function _dispatchInputEvent(){this._inputEndEvent.dispatch(this.createLabel())}},{key:"_getInputElement",value:function _getInputElement(){return this.element()}}]);return LabelInput}(Component_1.Component);exports.LabelInput=LabelInput;

},{"../../../../disposable/ListenableWindow":45,"../../../../utils/Vec2":53,"../../../component/Component":8,"../../../component/TagsName":9,"../DrawingParams":24,"./Label":33}],35:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var AnnotationDrawer_1=require("../AnnotationDrawer");var TextAlign_1=require("../../drawingcontext/TextAlign");var BaseShape_1=require("../BaseShape");var DrawingParams_1=require("../DrawingParams");var LabeledDot=/*#__PURE__*/function(_BaseShape_1$BaseShap){_inherits(LabeledDot,_BaseShape_1$BaseShap);function LabeledDot(dot,label){var _this;_classCallCheck(this,LabeledDot);_this=_possibleConstructorReturn(this,_getPrototypeOf(LabeledDot).call(this));_this._dot=dot;_this._label=label;return _this}_createClass(LabeledDot,[{key:"owns",value:function owns(cord){return this._dot.owns(cord)}},{key:"draw",value:function draw(drawingContext){drawingContext.setFill(this.selected()?DrawingParams_1.DrawingParams.selectedLinesColor():DrawingParams_1.DrawingParams.linesColor());this._dot.draw(drawingContext);drawingContext.setTextAlign(TextAlign_1.TextAlign.left);AnnotationDrawer_1.AnnotationDrawer.drawLabel(drawingContext,this._label.label(),this._label.position())}},{key:"serialize",value:function serialize(){return{model:"dot",data:{position:this._dot.position(),label:this._label.label()}}}}]);return LabeledDot}(BaseShape_1.BaseShape);exports.LabeledDot=LabeledDot;

},{"../../drawingcontext/TextAlign":19,"../AnnotationDrawer":20,"../BaseShape":21,"../DrawingParams":24}],36:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var BoundingRect_1=require("../../../../utils/BoundingRect");var Size_1=require("../../../../utils/Size");var DrawingParams_1=require("../DrawingParams");var BaseShape_1=require("../BaseShape");var CleanArea=/*#__PURE__*/function(_BaseShape_1$BaseShap){_inherits(CleanArea,_BaseShape_1$BaseShap);function CleanArea(center){var _this;_classCallCheck(this,CleanArea);_this=_possibleConstructorReturn(this,_getPrototypeOf(CleanArea).call(this));var size=new Size_1.Size(DrawingParams_1.DrawingParams.eraserSize(),DrawingParams_1.DrawingParams.eraserSize());_this._rect=new BoundingRect_1.BoundingRect(center,size);return _this}_createClass(CleanArea,[{key:"owns",value:function owns(cord){return false}},{key:"draw",value:function draw(drawingContext){drawingContext.clean(this._rect)}},{key:"serialize",value:function serialize(){return{model:"eraser",data:this._rect}}}]);return CleanArea}(BaseShape_1.BaseShape);exports.CleanArea=CleanArea;

},{"../../../../utils/BoundingRect":49,"../../../../utils/Size":51,"../BaseShape":21,"../DrawingParams":24}],37:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var DrawTool_1=require("../DrawTool");var CleanArea_1=require("./CleanArea");var DrawingParams_1=require("../DrawingParams");var Vec2_1=require("../../../../utils/Vec2");var Icons_1=require("../../../Icons");var EraserTool=/*#__PURE__*/function(_DrawTool_1$DrawTool){_inherits(EraserTool,_DrawTool_1$DrawTool);function EraserTool(){var _this;_classCallCheck(this,EraserTool);_this=_possibleConstructorReturn(this,_getPrototypeOf(EraserTool).apply(this,arguments));_this._active=false;return _this}_createClass(EraserTool,[{key:"icon",value:function icon(){return Icons_1.Icons.eraser()}},{key:"_mouseDownHandler",value:function _mouseDownHandler(_ref){var relativeCords=_ref.relativeCords;this._active=true;var shape=new CleanArea_1.CleanArea(this._getEraserPosition(relativeCords).clone());this._dispatchAddShapeEvent(shape)}},{key:"_mouseMoveHandler",value:function _mouseMoveHandler(_ref2){var relativeCords=_ref2.relativeCords;var mouseCord=this._getEraserPosition(relativeCords);this._drawEraser(mouseCord.clone());if(this._active){var shape=new CleanArea_1.CleanArea(mouseCord.clone());this._dispatchAddShapeEvent(shape)}}},{key:"_mouseUpHandler",value:function _mouseUpHandler(data){this._active=false}},{key:"_getEraserPosition",value:function _getEraserPosition(position){position.x-=DrawingParams_1.DrawingParams.eraserSize()/2;position.y-=DrawingParams_1.DrawingParams.eraserSize()/2;return position}},{key:"_drawEraser",value:function _drawEraser(pos){this._drawingContext.clean();this._drawingContext.setFill(DrawingParams_1.DrawingParams.eraserColor());this._drawingContext.setStroke(DrawingParams_1.DrawingParams.eraserBorderColor());this._drawingContext.setStrokeWidth(DrawingParams_1.DrawingParams.eraserBorderWidth());this._drawingContext.beginPath();var startAngle=0;var roundAngle=Math.PI/2;this._drawingContext.arc(new Vec2_1.Vec2(pos.x+DrawingParams_1.DrawingParams.eraserSize()-DrawingParams_1.DrawingParams.eraserCornerRounding(),pos.y+DrawingParams_1.DrawingParams.eraserSize()-DrawingParams_1.DrawingParams.eraserCornerRounding()),DrawingParams_1.DrawingParams.eraserCornerRounding(),startAngle,roundAngle);this._drawingContext.lineTo(new Vec2_1.Vec2(pos.x+DrawingParams_1.DrawingParams.eraserCornerRounding(),pos.y+DrawingParams_1.DrawingParams.eraserSize()));startAngle+=roundAngle;this._drawingContext.arc(new Vec2_1.Vec2(pos.x+DrawingParams_1.DrawingParams.eraserCornerRounding(),pos.y+DrawingParams_1.DrawingParams.eraserSize()-DrawingParams_1.DrawingParams.eraserCornerRounding()),DrawingParams_1.DrawingParams.eraserCornerRounding(),startAngle,roundAngle);this._drawingContext.lineTo(new Vec2_1.Vec2(pos.x,pos.y+DrawingParams_1.DrawingParams.eraserCornerRounding()));startAngle+=roundAngle;this._drawingContext.arc(new Vec2_1.Vec2(pos.x+DrawingParams_1.DrawingParams.eraserCornerRounding(),pos.y+DrawingParams_1.DrawingParams.eraserCornerRounding()),DrawingParams_1.DrawingParams.eraserCornerRounding(),startAngle,roundAngle);this._drawingContext.lineTo(new Vec2_1.Vec2(pos.x+DrawingParams_1.DrawingParams.eraserSize()-DrawingParams_1.DrawingParams.eraserCornerRounding(),pos.y));startAngle+=roundAngle;this._drawingContext.arc(new Vec2_1.Vec2(pos.x+DrawingParams_1.DrawingParams.eraserSize()-DrawingParams_1.DrawingParams.eraserCornerRounding(),pos.y+DrawingParams_1.DrawingParams.eraserCornerRounding()),DrawingParams_1.DrawingParams.eraserCornerRounding(),startAngle,roundAngle);this._drawingContext.closePath();this._drawingContext.fill();this._drawingContext.stroke()}}]);return EraserTool}(DrawTool_1.DrawTool);exports.EraserTool=EraserTool;

},{"../../../../utils/Vec2":53,"../../../Icons":6,"../DrawTool":23,"../DrawingParams":24,"./CleanArea":36}],38:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var Vec2_1=require("../../../../utils/Vec2");var DrawingParams_1=require("../DrawingParams");var mathutils_1=require("../../../../utils/mathutils");var Transform_1=require("../../../../utils/Transform");var BaseShape_1=require("../BaseShape");var Line=/*#__PURE__*/function(_BaseShape_1$BaseShap){_inherits(Line,_BaseShape_1$BaseShap);function Line(start,end){var _this;_classCallCheck(this,Line);_this=_possibleConstructorReturn(this,_getPrototypeOf(Line).call(this));_this._start=start;_this._end=end;return _this}_createClass(Line,[{key:"owns",value:function owns(cord){var translate=Transform_1.Transform.translate(this._start.clone().scale(-1));var accuracy=5;cord=translate.transform(cord);var start=translate.transform(this._start);var end=translate.transform(this._end);var rotate=Transform_1.Transform.rotate(-end.angle());start=rotate.transform(start);end=rotate.transform(end);cord=rotate.transform(cord);return start.x-accuracy<=cord.x&&cord.x<=end.x-accuracy&&start.y-accuracy<=cord.y&&cord.y<=start.y+accuracy&&end.y-accuracy<=cord.y&&cord.y<=end.y+accuracy}},{key:"setEnd",value:function setEnd(end){var reduced=arguments.length>1&&arguments[1]!==undefined?arguments[1]:false;if(!reduced){this._end=end;return}var reduceStep=15;var vec=end.clone().reduce(this._start);var angle=mathutils_1.toDegrease(vec.angle());var reducedAngle=mathutils_1.toRadians(Math.round(angle/reduceStep)*reduceStep);this._end=this._start.clone().add(Vec2_1.createVec2ByPolar(reducedAngle,vec.radius()))}},{key:"end",value:function end(){return this._end.clone()}},{key:"start",value:function start(){return this._start.clone()}},{key:"draw",value:function draw(drawingContext){drawingContext.setStroke(this.selected()?DrawingParams_1.DrawingParams.selectedLinesColor():DrawingParams_1.DrawingParams.linesColor());drawingContext.setStrokeWidth(DrawingParams_1.DrawingParams.linesWidth());drawingContext.beginPath();drawingContext.moveTo(this.start());drawingContext.lineTo(this.end());drawingContext.stroke()}},{key:"serialize",value:function serialize(){return{model:"line",data:{start:this._start,end:this._end}}}}]);return Line}(BaseShape_1.BaseShape);exports.Line=Line;

},{"../../../../utils/Transform":52,"../../../../utils/Vec2":53,"../../../../utils/mathutils":54,"../BaseShape":21,"../DrawingParams":24}],39:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var DrawTool_1=require("../DrawTool");var Line_1=require("./Line");var AnnotationDrawer_1=require("../AnnotationDrawer");var Icons_1=require("../../../Icons");var LineTool=/*#__PURE__*/function(_DrawTool_1$DrawTool){_inherits(LineTool,_DrawTool_1$DrawTool);function LineTool(){var _this;_classCallCheck(this,LineTool);_this=_possibleConstructorReturn(this,_getPrototypeOf(LineTool).apply(this,arguments));_this._line=null;return _this}_createClass(LineTool,[{key:"icon",value:function icon(){return Icons_1.Icons.pencil()}},{key:"reset",value:function reset(){this._drawingContext.clean();this._line=null}},{key:"_mouseDownHandler",value:function _mouseDownHandler(_ref){var relativeCords=_ref.relativeCords;if(!this._line){this._line=new Line_1.Line(relativeCords,relativeCords);this._invalidateLineView()}else{this._dispatchAddShapeEvent(this._line);this.reset()}}},{key:"_mouseMoveHandler",value:function _mouseMoveHandler(data){if(this._line){this._line.setEnd(data.relativeCords,data.shiftKey);this._invalidateLineView()}}},{key:"_invalidateLineView",value:function _invalidateLineView(){this._drawingContext.clean();if(this._line){this._line.draw(this._drawingContext);AnnotationDrawer_1.AnnotationDrawer.drawLineAnnotation(this._drawingContext,this._line)}}}]);return LineTool}(DrawTool_1.DrawTool);exports.LineTool=LineTool;

},{"../../../Icons":6,"../AnnotationDrawer":20,"../DrawTool":23,"./Line":38}],40:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var BaseTool_1=require("../BaseTool");var SelectAction_1=require("../../action/SelectAction");var Icons_1=require("../../../Icons");var SelectTool=/*#__PURE__*/function(_BaseTool_1$BaseTool){_inherits(SelectTool,_BaseTool_1$BaseTool);function SelectTool(drawingContext,mouseEventDispatcher,shapes){var _this;_classCallCheck(this,SelectTool);_this=_possibleConstructorReturn(this,_getPrototypeOf(SelectTool).call(this,drawingContext,mouseEventDispatcher));_this._shapes=shapes;return _this}_createClass(SelectTool,[{key:"icon",value:function icon(){return Icons_1.Icons.select()}},{key:"cursor",value:function cursor(){return"pointer"}},{key:"_mouseDownHandler",value:function _mouseDownHandler(data){var shape=this._shapes.getShape(data.relativeCords);if(shape){this._dispatchActionCreatedEvent(new SelectAction_1.SelectAction(shape))}}}]);return SelectTool}(BaseTool_1.BaseTool);exports.SelectTool=SelectTool;

},{"../../../Icons":6,"../../action/SelectAction":17,"../BaseTool":22}],41:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var BrowserEventsHandlersHolder=/*#__PURE__*/function(){function BrowserEventsHandlersHolder(target){_classCallCheck(this,BrowserEventsHandlersHolder);this._handlersCleaner=new Map;this._target=target}_createClass(BrowserEventsHandlersHolder,[{key:"addHandler",value:function addHandler(eventType,handler,id){var _this=this;this._target.eventTarget().addEventListener(eventType,handler);this._handlersCleaner.set(id,function(){return _this._target.eventTarget().removeEventListener(eventType,handler)})}},{key:"removeHandler",value:function removeHandler(id){if(this._handlersCleaner.has(id)){this._handlersCleaner.get(id)();this._handlersCleaner.delete(id)}}},{key:"clean",value:function clean(){var _iteratorNormalCompletion=true;var _didIteratorError=false;var _iteratorError=undefined;try{for(var _iterator=this._handlersCleaner.values()[Symbol.iterator](),_step;!(_iteratorNormalCompletion=(_step=_iterator.next()).done);_iteratorNormalCompletion=true){var handlerCleaner=_step.value;handlerCleaner()}}catch(err){_didIteratorError=true;_iteratorError=err}finally{try{if(!_iteratorNormalCompletion&&_iterator.return!=null){_iterator.return()}}finally{if(_didIteratorError){throw _iteratorError}}}this._handlersCleaner.clear()}}]);return BrowserEventsHandlersHolder}();exports.BrowserEventsHandlersHolder=BrowserEventsHandlersHolder;

},{}],42:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var EventDispatcher_1=require("./EventDispatcher");var BrowserEventsHandlersHolder_1=require("./BrowserEventsHandlersHolder");var EnventsHanldersHolder_1=require("./EnventsHanldersHolder");var Disposable=/*#__PURE__*/function(){function Disposable(){_classCallCheck(this,Disposable);this._timeoutsKeys=[];this._intervalsKeys=[];this._dependentObjects=new Set;this._browserEventsHandlersHolders=new Map;this._eventsHandlersHolders=new Map;this._handlersId=0}_createClass(Disposable,[{key:"dispose",value:function dispose(){this._destruct();this._clearTimeouts();this._clearIntervals();var _iteratorNormalCompletion=true;var _didIteratorError=false;var _iteratorError=undefined;try{for(var _iterator=this._browserEventsHandlersHolders.values()[Symbol.iterator](),_step;!(_iteratorNormalCompletion=(_step=_iterator.next()).done);_iteratorNormalCompletion=true){var holder=_step.value;holder.clean()}}catch(err){_didIteratorError=true;_iteratorError=err}finally{try{if(!_iteratorNormalCompletion&&_iterator.return!=null){_iterator.return()}}finally{if(_didIteratorError){throw _iteratorError}}}this._browserEventsHandlersHolders.clear();var _iteratorNormalCompletion2=true;var _didIteratorError2=false;var _iteratorError2=undefined;try{for(var _iterator2=this._eventsHandlersHolders.values()[Symbol.iterator](),_step2;!(_iteratorNormalCompletion2=(_step2=_iterator2.next()).done);_iteratorNormalCompletion2=true){var _holder=_step2.value;_holder.clean()}}catch(err){_didIteratorError2=true;_iteratorError2=err}finally{try{if(!_iteratorNormalCompletion2&&_iterator2.return!=null){_iterator2.return()}}finally{if(_didIteratorError2){throw _iteratorError2}}}this._eventsHandlersHolders.clear();var _iteratorNormalCompletion3=true;var _didIteratorError3=false;var _iteratorError3=undefined;try{for(var _iterator3=this._dependentObjects.values()[Symbol.iterator](),_step3;!(_iteratorNormalCompletion3=(_step3=_iterator3.next()).done);_iteratorNormalCompletion3=true){var dependentObj=_step3.value;dependentObj.dispose()}}catch(err){_didIteratorError3=true;_iteratorError3=err}finally{try{if(!_iteratorNormalCompletion3&&_iterator3.return!=null){_iterator3.return()}}finally{if(_didIteratorError3){throw _iteratorError3}}}}},{key:"_destruct",value:function _destruct(){}},{key:"_createEventDispatcher",value:function _createEventDispatcher(){var dispatcher=new EventDispatcher_1.EventDispatcher(this);this._addDisposable(dispatcher);for(var _len=arguments.length,parentEvent=new Array(_len),_key=0;_key<_len;_key++){parentEvent[_key]=arguments[_key]}for(var _i=0;_i<parentEvent.length;_i++){var event=parentEvent[_i];this._addHandler(event,function(arg){return dispatcher.dispatch(arg)})}return dispatcher}},{key:"_addDisposable",value:function _addDisposable(dependentObject){this._dependentObjects.add(dependentObject)}},{key:"_removeDisposable",value:function _removeDisposable(dependentObject){this._dependentObjects.delete(dependentObject);this._removeDependency(dependentObject);dependentObject.dispose()}},{key:"_addHandler",value:function _addHandler(event,handler){this._handlersId++;var owner=event.eventOwner();if(!this._eventsHandlersHolders.has(owner)){this._eventsHandlersHolders.set(owner,new EnventsHanldersHolder_1.EventsHandlersHolder)}this._eventsHandlersHolders.get(owner).addHandler(event,handler,this._handlersId);return this._handlersId}},{key:"_addHandlerCallOnce",value:function _addHandlerCallOnce(event,handler){var _this=this;var id=this._addHandler(event,function(arg){handler(arg);_this._removeHandler(id)});return id}},{key:"_removeHandler",value:function _removeHandler(id){var _iteratorNormalCompletion4=true;var _didIteratorError4=false;var _iteratorError4=undefined;try{for(var _iterator4=this._eventsHandlersHolders.values()[Symbol.iterator](),_step4;!(_iteratorNormalCompletion4=(_step4=_iterator4.next()).done);_iteratorNormalCompletion4=true){var handlersHolder=_step4.value;handlersHolder.removeHandler(id)}}catch(err){_didIteratorError4=true;_iteratorError4=err}finally{try{if(!_iteratorNormalCompletion4&&_iterator4.return!=null){_iterator4.return()}}finally{if(_didIteratorError4){throw _iteratorError4}}}}},{key:"_listen",value:function _listen(type,target,handler){this._handlersId++;if(!this._eventsHandlersHolders.has(target)){this._browserEventsHandlersHolders.set(target,new BrowserEventsHandlersHolder_1.BrowserEventsHandlersHolder(target))}this._browserEventsHandlersHolders.get(target).addHandler(type,handler,this._handlersId);return this._handlersId}},{key:"_listenOnce",value:function _listenOnce(type,target,handler){var _this2=this;var id=this._listen(type,target,function(arg){handler(arg);_this2._unlisten(id)});return id}},{key:"_setTimeout",value:function _setTimeout(fn,timeout){var key=setTimeout(fn,timeout);this._timeoutsKeys.push(key);return key}},{key:"_setInterval",value:function _setInterval(fn,timeout){var key=setInterval(fn,timeout);this._intervalsKeys.push(key);return key}},{key:"_clearTimeouts",value:function _clearTimeouts(){var _iteratorNormalCompletion5=true;var _didIteratorError5=false;var _iteratorError5=undefined;try{for(var _iterator5=this._timeoutsKeys[Symbol.iterator](),_step5;!(_iteratorNormalCompletion5=(_step5=_iterator5.next()).done);_iteratorNormalCompletion5=true){var key=_step5.value;clearTimeout(key)}}catch(err){_didIteratorError5=true;_iteratorError5=err}finally{try{if(!_iteratorNormalCompletion5&&_iterator5.return!=null){_iterator5.return()}}finally{if(_didIteratorError5){throw _iteratorError5}}}}},{key:"_clearIntervals",value:function _clearIntervals(){var _iteratorNormalCompletion6=true;var _didIteratorError6=false;var _iteratorError6=undefined;try{for(var _iterator6=this._intervalsKeys[Symbol.iterator](),_step6;!(_iteratorNormalCompletion6=(_step6=_iterator6.next()).done);_iteratorNormalCompletion6=true){var key=_step6.value;clearInterval(key)}}catch(err){_didIteratorError6=true;_iteratorError6=err}finally{try{if(!_iteratorNormalCompletion6&&_iterator6.return!=null){_iterator6.return()}}finally{if(_didIteratorError6){throw _iteratorError6}}}}},{key:"_unlisten",value:function _unlisten(id){var _iteratorNormalCompletion7=true;var _didIteratorError7=false;var _iteratorError7=undefined;try{for(var _iterator7=this._browserEventsHandlersHolders.values()[Symbol.iterator](),_step7;!(_iteratorNormalCompletion7=(_step7=_iterator7.next()).done);_iteratorNormalCompletion7=true){var handlersHolder=_step7.value;handlersHolder.removeHandler(id)}}catch(err){_didIteratorError7=true;_iteratorError7=err}finally{try{if(!_iteratorNormalCompletion7&&_iterator7.return!=null){_iterator7.return()}}finally{if(_didIteratorError7){throw _iteratorError7}}}}},{key:"_removeDependency",value:function _removeDependency(){for(var _len2=arguments.length,dependentObjects=new Array(_len2),_key2=0;_key2<_len2;_key2++){dependentObjects[_key2]=arguments[_key2]}for(var _i2=0;_i2<dependentObjects.length;_i2++){var dependentObject=dependentObjects[_i2];if(this._browserEventsHandlersHolders.has(dependentObject)){this._browserEventsHandlersHolders.get(dependentObject).clean()}if(this._eventsHandlersHolders.has(dependentObject)){this._eventsHandlersHolders.get(dependentObject).clean()}}}}]);return Disposable}();exports.Disposable=Disposable;

},{"./BrowserEventsHandlersHolder":41,"./EnventsHanldersHolder":43,"./EventDispatcher":44}],43:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var EventsHandlersHolder=/*#__PURE__*/function(){function EventsHandlersHolder(){_classCallCheck(this,EventsHandlersHolder);this._handlersCleaner=new Map}_createClass(EventsHandlersHolder,[{key:"addHandler",value:function addHandler(event,handler,id){event.addHandler(handler);this._handlersCleaner.set(id,function(){return event.removeHandler(handler)})}},{key:"removeHandler",value:function removeHandler(id){if(this._handlersCleaner.has(id)){this._handlersCleaner.get(id)();this._handlersCleaner.delete(id)}}},{key:"clean",value:function clean(){var _iteratorNormalCompletion=true;var _didIteratorError=false;var _iteratorError=undefined;try{for(var _iterator=this._handlersCleaner.values()[Symbol.iterator](),_step;!(_iteratorNormalCompletion=(_step=_iterator.next()).done);_iteratorNormalCompletion=true){var handlerCleaner=_step.value;handlerCleaner()}}catch(err){_didIteratorError=true;_iteratorError=err}finally{try{if(!_iteratorNormalCompletion&&_iterator.return!=null){_iterator.return()}}finally{if(_didIteratorError){throw _iteratorError}}}this._handlersCleaner.clear()}}]);return EventsHandlersHolder}();exports.EventsHandlersHolder=EventsHandlersHolder;

},{}],44:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var EventDispatcher=/*#__PURE__*/function(){function EventDispatcher(eventOwner){_classCallCheck(this,EventDispatcher);this._handlers=new Set;this._eventOwner=eventOwner}_createClass(EventDispatcher,[{key:"addHandler",value:function addHandler(handler){this._handlers.add(handler)}},{key:"removeHandler",value:function removeHandler(handler){this._handlers.delete(handler)}},{key:"dispatch",value:function dispatch(data){var _iteratorNormalCompletion=true;var _didIteratorError=false;var _iteratorError=undefined;try{for(var _iterator=this._handlers.values()[Symbol.iterator](),_step;!(_iteratorNormalCompletion=(_step=_iterator.next()).done);_iteratorNormalCompletion=true){var handler=_step.value;handler(data)}}catch(err){_didIteratorError=true;_iteratorError=err}finally{try{if(!_iteratorNormalCompletion&&_iterator.return!=null){_iterator.return()}}finally{if(_didIteratorError){throw _iteratorError}}}}},{key:"eventOwner",value:function eventOwner(){return this._eventOwner}},{key:"dispose",value:function dispose(){this._handlers=new Set}}]);return EventDispatcher}();exports.EventDispatcher=EventDispatcher;

},{}],45:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var Disposable_1=require("./Disposable");var ListenableWindow=/*#__PURE__*/function(_Disposable_1$Disposa){_inherits(ListenableWindow,_Disposable_1$Disposa);function ListenableWindow(){_classCallCheck(this,ListenableWindow);return _possibleConstructorReturn(this,_getPrototypeOf(ListenableWindow).apply(this,arguments))}_createClass(ListenableWindow,[{key:"eventTarget",value:function eventTarget(){return window}}]);return ListenableWindow}(Disposable_1.Disposable);exports.ListenableWindow=ListenableWindow;

},{"./Disposable":42}],46:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var Disposable_1=require("../disposable/Disposable");var ListenableWindow_1=require("../disposable/ListenableWindow");var REDO_KEY="KeyY";var UNDO_KEY="KeyZ";var RESET_KEY="Escape";var HotKeyBinder=/*#__PURE__*/function(_Disposable_1$Disposa){_inherits(HotKeyBinder,_Disposable_1$Disposa);function HotKeyBinder(){var _this;_classCallCheck(this,HotKeyBinder);_this=_possibleConstructorReturn(this,_getPrototypeOf(HotKeyBinder).call(this));_this._listenableWindow=new ListenableWindow_1.ListenableWindow;_this._addDisposable(_this._listenableWindow);_this._listen("keydown",_this._listenableWindow,function(event){requestAnimationFrame(function(){return _this._handleKeyDown(event)})});return _this}_createClass(HotKeyBinder,[{key:"clean",value:function clean(){delete this._undoHandler;delete this._redoHandler;delete this._resetHandler}},{key:"setActionController",value:function setActionController(actionController){this._undoHandler=function(){return actionController.undo()};this._redoHandler=function(){return actionController.redo()}}},{key:"setResetHandler",value:function setResetHandler(resetHandler){this._resetHandler=resetHandler}},{key:"_handleKeyDown",value:function _handleKeyDown(event){switch(event.code){case UNDO_KEY:return event.ctrlKey&&this._undoHandler&&this._undoHandler();case REDO_KEY:return event.ctrlKey&&this._redoHandler&&this._redoHandler();case RESET_KEY:return this._resetHandler&&this._resetHandler();}}}]);return HotKeyBinder}(Disposable_1.Disposable);exports.HotKeyBinder=HotKeyBinder;

},{"../disposable/Disposable":42,"../disposable/ListenableWindow":45}],47:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var mathutils_1=require("../utils/mathutils");var ArrIterator=/*#__PURE__*/function(){function ArrIterator(index,entities){_classCallCheck(this,ArrIterator);this._index=0;this._entities=[];this._index=index;this._entities=entities;this._validateIndex()}_createClass(ArrIterator,[{key:"next",value:function next(){this._index=++this._index;this._validateIndex();return this}},{key:"prev",value:function prev(){this._index--;this._validateIndex();return this}},{key:"insert",value:function insert(change){this._entities.splice(this._index,0,change);return this}},{key:"deleteTail",value:function deleteTail(){this._entities.splice(this._index,this._entities.length);return this}},{key:"value",value:function value(){return this._entities[this._index]}},{key:"clone",value:function clone(){return new ArrIterator(this._index,this._entities)}},{key:"equal",value:function equal(it){var _this=this;return it._index==this._index&&it._entities.every(function(change,index){return _this._entities[index]==it._entities[index]})}},{key:"_validateIndex",value:function _validateIndex(){this._index=mathutils_1.clamp(this._index,0,this._entities.length)}}]);return ArrIterator}();exports.ArrIterator=ArrIterator;function iterate(from,to,fn){var it=from;while(!it.equal(to)){fn(it.value())}}exports.iterate=iterate;

},{"../utils/mathutils":54}],48:[function(require,module,exports){
"use strict";function isNativeReflectConstruct(){if(typeof Reflect==="undefined"||!Reflect.construct)return false;if(Reflect.construct.sham)return false;if(typeof Proxy==="function")return true;try{Date.prototype.toString.call(Reflect.construct(Date,[],function(){}));return true}catch(e){return false}}function _construct(Parent,args,Class){if(isNativeReflectConstruct()){_construct=Reflect.construct}else{_construct=function _construct(Parent,args,Class){var a=[null];a.push.apply(a,args);var Constructor=Function.bind.apply(Parent,a);var instance=new Constructor;if(Class)_setPrototypeOf(instance,Class.prototype);return instance}}return _construct.apply(null,arguments)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}function _toConsumableArray(arr){return _arrayWithoutHoles(arr)||_iterableToArray(arr)||_nonIterableSpread()}function _nonIterableSpread(){throw new TypeError("Invalid attempt to spread non-iterable instance")}function _iterableToArray(iter){if(Symbol.iterator in Object(iter)||Object.prototype.toString.call(iter)==="[object Arguments]")return Array.from(iter)}function _arrayWithoutHoles(arr){if(Array.isArray(arr)){for(var i=0,arr2=new Array(arr.length);i<arr.length;i++){arr2[i]=arr[i]}return arr2}}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var Iterator=/*#__PURE__*/function(){function Iterator(values){_classCallCheck(this,Iterator);this._pointer=0;this._values=_construct(Array,_toConsumableArray(values))}_createClass(Iterator,[{key:"next",value:function next(){if(this._pointer<this._values.length){return{done:false,value:this._values[this._pointer++]}}else{return{done:true,value:null}}}}]);return Iterator}();exports.Iterator=Iterator;

},{}],49:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var Vec2_1=require("./Vec2");var Size_1=require("./Size");var BoundingRect=/*#__PURE__*/function(){function BoundingRect(pos,size){_classCallCheck(this,BoundingRect);this.x=pos.x;this.y=pos.y;this.width=size.width;this.height=size.height}_createClass(BoundingRect,[{key:"clone",value:function clone(){return new BoundingRect(new Vec2_1.Vec2(this.x,this.y),new Size_1.Size(this.width,this.height))}},{key:"toString",value:function toString(){return"{\n            x: ".concat(this.x,",\n            y: ").concat(this.y,",\n            width: ").concat(this.width,",\n            height: ").concat(this.height,"\n        }")}}]);return BoundingRect}();exports.BoundingRect=BoundingRect;

},{"./Size":51,"./Vec2":53}],50:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}Object.defineProperty(exports,"__esModule",{value:true});var Disposable_1=require("../disposable/Disposable");var FramesController_1=require("../animation/FramesController");var Size_1=require("./Size");var ResizeObserver=/*#__PURE__*/function(_Disposable_1$Disposa){_inherits(ResizeObserver,_Disposable_1$Disposa);function ResizeObserver(){var _this;_classCallCheck(this,ResizeObserver);_this=_possibleConstructorReturn(this,_getPrototypeOf(ResizeObserver).call(this));_this._resizeEvent=_this._createEventDispatcher();for(var _len=arguments.length,components=new Array(_len),_key=0;_key<_len;_key++){components[_key]=arguments[_key]}_this._componentsList=components.map(function(component){return{component:component,size:new Size_1.Size(component.width(),component.height())}});FramesController_1.FramesController.addFrameHandler(_assertThisInitialized(_assertThisInitialized(_this)));return _this}_createClass(ResizeObserver,[{key:"resizeEvent",value:function resizeEvent(){return this._resizeEvent}},{key:"onFrame",value:function onFrame(){var _iteratorNormalCompletion=true;var _didIteratorError=false;var _iteratorError=undefined;try{for(var _iterator=this._componentsList[Symbol.iterator](),_step;!(_iteratorNormalCompletion=(_step=_iterator.next()).done);_iteratorNormalCompletion=true){var element=_step.value;var newSize=new Size_1.Size(element.component.width(),element.component.height());if(!element.size.equal(newSize)){element.size=newSize;this._resizeEvent.dispatch(element.component)}}}catch(err){_didIteratorError=true;_iteratorError=err}finally{try{if(!_iteratorNormalCompletion&&_iterator.return!=null){_iterator.return()}}finally{if(_didIteratorError){throw _iteratorError}}}}},{key:"_destruct",value:function _destruct(){FramesController_1.FramesController.removeFrameHandler(this)}}]);return ResizeObserver}(Disposable_1.Disposable);exports.ResizeObserver=ResizeObserver;

},{"../animation/FramesController":5,"../disposable/Disposable":42,"./Size":51}],51:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var Size=/*#__PURE__*/function(){function Size(width,height){_classCallCheck(this,Size);this.width=width;this.height=height}_createClass(Size,[{key:"equal",value:function equal(size){return this.width==size.width&&this.height==size.height}},{key:"clone",value:function clone(){return new Size(this.width,this.height)}},{key:"toString",value:function toString(){return JSON.stringify({width:this.width,height:this.height})}}]);return Size}();exports.Size=Size;

},{}],52:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var Vec2_1=require("./Vec2");var Transform=/*#__PURE__*/function(){function Transform(config){_classCallCheck(this,Transform);this._points=config}_createClass(Transform,[{key:"add",value:function add(tansform){var points1=Object.assign(tansform._points);var points2=Object.assign(this._points);points1._00=points1._00*points2._00+points1._01*points2._10;points1._01=points1._00*points2._01+points1._01*points2._11;points1._10=points1._10*points2._00+points1._11*points2._10;points1._11=points1._10*points2._01+points1._11*points2._11;points1._02=points1._00*points2._02+points1._01*points2._12+points1._02;points1._12=points1._10*points2._02+points1._11*points2._12+points1._12;this._points=points1;return this}},{key:"rotate",value:function rotate(angle){return this.add(Transform.rotate(angle))}},{key:"scale",value:function scale(scaleX,scaleY){return this.add(Transform.scale(scaleX,scaleY))}},{key:"translate",value:function translate(vec){return this.add(Transform.translate(vec))}},{key:"transform",value:function transform(vec){var x=vec.x*this._points._00+vec.y*this._points._01+this._points._02;var y=vec.x*this._points._10+vec.y*this._points._11+this._points._12;return new Vec2_1.Vec2(x,y)}}],[{key:"rotate",value:function rotate(angle){return new Transform({_00:Math.cos(-angle),_01:Math.sin(-angle),_02:0,_10:-Math.sin(-angle),_11:Math.cos(-angle),_12:0})}},{key:"scale",value:function scale(scaleX,scaleY){return new Transform({_00:scaleX,_01:0,_02:0,_10:0,_11:scaleY,_12:0})}},{key:"translate",value:function translate(vec){return new Transform({_00:1,_01:0,_02:vec.x,_10:0,_11:1,_12:vec.y})}}]);return Transform}();exports.Transform=Transform;

},{"./Vec2":53}],53:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var mathutils_1=require("./mathutils");var Vec2=/*#__PURE__*/function(){function Vec2(x,y){_classCallCheck(this,Vec2);this.x=x;this.y=y}_createClass(Vec2,[{key:"angle",value:function angle(){var angle=Math.atan(this.y/this.x);return mathutils_1.normalizeAngle(this.x<0?Math.PI+angle:angle)}},{key:"radius",value:function radius(){return Math.hypot(this.x,this.y)}},{key:"clone",value:function clone(){return new Vec2(this.x,this.y)}},{key:"scale",value:function scale(_scale){this.x*=_scale;this.y*=_scale;return this}},{key:"add",value:function add(vec){this.x+=vec.x;this.y+=vec.y;return this}},{key:"reduce",value:function reduce(vec){this.add(vec.clone().scale(-1));return this}},{key:"toString",value:function toString(){return"{x: ".concat(this.x,", y: ").concat(this.y,"}")}}]);return Vec2}();exports.Vec2=Vec2;function createVec2ByPolar(angle,radius){return new Vec2(Math.cos(angle)*radius,Math.sin(angle)*radius)}exports.createVec2ByPolar=createVec2ByPolar;

},{"./mathutils":54}],54:[function(require,module,exports){
"use strict";Object.defineProperty(exports,"__esModule",{value:true});function normalizeAngle(angle){return(angle%(Math.PI*2)+Math.PI*2)%(Math.PI*2)}exports.normalizeAngle=normalizeAngle;function clamp(val,min,max){return Math.max(min,Math.min(val,max))}exports.clamp=clamp;function toDegrease(angle){return 180*angle/Math.PI}exports.toDegrease=toDegrease;function toRadians(angle){return angle/180*Math.PI}exports.toRadians=toRadians;

},{}],55:[function(require,module,exports){
"use strict";Object.defineProperty(exports,"__esModule",{value:true});function toCamelCase(str){return String(str).replace(/-([a-z])/g,function(all,match){return match.toUpperCase()})}exports.toCamelCase=toCamelCase;

},{}],56:[function(require,module,exports){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}Object.defineProperty(exports,"__esModule",{value:true});function verifyObject(a){return verifyType(a,"object")}exports.verifyObject=verifyObject;function verifyString(a){return verifyType(a,"string")}exports.verifyString=verifyString;function verifyBoolean(a){return verifyType(a,"boolean")}exports.verifyBoolean=verifyBoolean;function verifyNumber(a){var numb=verifyType(a,"number");if(isNaN(numb)){throw new Error("Unexpected not a number number")}return numb}exports.verifyNumber=verifyNumber;function verifyType(a,type){if(_typeof(a)==type){return a}throw new Error("Unexpected type: ".concat(_typeof(a)))}function isBool(a){return typeof a=="boolean"}exports.isBool=isBool;function isNumber(a){return typeof a=="number"}exports.isNumber=isNumber;function isString(a){return typeof a=="string"}exports.isString=isString;function isFunction(a){return typeof a=="function"}exports.isFunction=isFunction;function verify(a){if(a){return a}throw new Error("Verify fail")}exports.verify=verify;

},{}],57:[function(require,module,exports){
(function (global){
"use strict";function _typeof(obj){if(typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"){_typeof=function _typeof(obj){return typeof obj}}else{_typeof=function _typeof(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj}}return _typeof(obj)}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}function _possibleConstructorReturn(self,call){if(call&&(_typeof(call)==="object"||typeof call==="function")){return call}return _assertThisInitialized(self)}function _assertThisInitialized(self){if(self===void 0){throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}return self}function _getPrototypeOf(o){_getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf:function _getPrototypeOf(o){return o.__proto__||Object.getPrototypeOf(o)};return _getPrototypeOf(o)}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function")}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:true,configurable:true}});if(superClass)_setPrototypeOf(subClass,superClass)}function _setPrototypeOf(o,p){_setPrototypeOf=Object.setPrototypeOf||function _setPrototypeOf(o,p){o.__proto__=p;return o};return _setPrototypeOf(o,p)}Object.defineProperty(exports,"__esModule",{value:true});var Component_1=require("../../_common/components/component/Component");var Workplace_1=require("../../_common/components/workplace/Workplace");var Toolbar_1=require("../../_common/components/toolbar/Toolbar");var ActionController_1=require("../../_common/action/ActionController");var HotKeysBinder_1=require("../../_common/hotkeys/HotKeysBinder");var ToolsCreator_1=require("./ToolsCreator");var DrawableArea=/*#__PURE__*/function(_Component_1$Componen){_inherits(DrawableArea,_Component_1$Componen);function DrawableArea(container){var _this;_classCallCheck(this,DrawableArea);_this=_possibleConstructorReturn(this,_getPrototypeOf(DrawableArea).call(this,{blockName:"drawable-area"}));_this._activated=true;_this._workplace=new Workplace_1.Workplace(new ToolsCreator_1.ToolsCreator());_this._toolbar=new Toolbar_1.Toolbar(_this._workplace.tools());container.appendChild(_this.element());var actionController=new ActionController_1.ActionController;_this._addDisposable(_this._workplace);_this.addChild(_this._workplace);_this._addHandler(_this._workplace.actionCreatedEvent(),function(action){_this._activated&&actionController.execute(action)});_this._addDisposable(_this._toolbar);_this.addChild(_this._toolbar);_this._addHandler(_this._toolbar.toolChangedEvent(),function(action){_this._activated&&actionController.execute(action)});_this._toolbar.activateFirstTool();var hotKeyBinder=new HotKeysBinder_1.HotKeyBinder;hotKeyBinder.setResetHandler(function(){return _this._toolbar.resetTools()});hotKeyBinder.setActionController(actionController);return _this}_createClass(DrawableArea,[{key:"activate",value:function activate(){this._activated=true;this.setStyle("pointer-events","");this._toolbar.activateFirstTool()}},{key:"deactivate",value:function deactivate(){this._activated=false;this.setStyle("pointer-events","none")}},{key:"reset",value:function reset(){this._workplace.clean();this._toolbar.resetTools()}},{key:"getValue",value:function getValue(){return this._workplace.getSerializedShapes(function(shape){return shape.selected()})}},{key:"setBackground",value:function setBackground(url){this._workplace.setBackgroundImage(url)}}]);return DrawableArea}(Component_1.Component);global.DrawableArea=DrawableArea;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../_common/action/ActionController":4,"../../_common/components/component/Component":8,"../../_common/components/toolbar/Toolbar":11,"../../_common/components/workplace/Workplace":15,"../../_common/hotkeys/HotKeysBinder":46,"./ToolsCreator":58}],58:[function(require,module,exports){
"use strict";function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}function _createClass(Constructor,protoProps,staticProps){if(protoProps)_defineProperties(Constructor.prototype,protoProps);if(staticProps)_defineProperties(Constructor,staticProps);return Constructor}Object.defineProperty(exports,"__esModule",{value:true});var ToolsCreator=/*#__PURE__*/function(){function ToolsCreator(){_classCallCheck(this,ToolsCreator)}_createClass(ToolsCreator,[{key:"createTools",value:function createTools(toolFactory){return[toolFactory.createLineTool(),toolFactory.createCompassTool(),toolFactory.createDotTool(),toolFactory.createSelectTool()]}}]);return ToolsCreator}();exports.ToolsCreator=ToolsCreator;

},{}]},{},[57]);
