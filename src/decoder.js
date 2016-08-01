'use strict';

const debug = require('debug')('dec0de:decoder');
const assert = require('assert');

class Decoder {

    constructor(generator) {
        this._generator = generator;
        this._buffer = Buffer.alloc(0);
        this.resetState();
    }

    use(gen, ...args) {
        if (gen.next) {
            this._iterator = gen;
        } else {
            this._iterator = gen(...args);
        }
    }

    resetState() {
        this._currentStep = null;
        this.use(this._generator);
    }

    decode(newBuffer) {
        assert(this._iterator, 'decoder not initialized ' +
            '(make sure you call `use` before `decode`)');
        this._buffer = Buffer.concat([this._buffer, newBuffer]);
        this._proceed();
    }

    _proceed() {
        // start
        if (!this._currentStep) {
            this._currentStep = this._iterator.next(Buffer.alloc(0));
        }
        while (!this._currentStep.done) {
            const i = valueToIndex(this._buffer, this._currentStep.value);
            if (i < 0 || this._buffer.length < i) {
                return; // wait for more data
            }
            const data = this._buffer.slice(0, i);
            this._buffer = this._buffer.slice(i);
            debug('match', data.length, debugVal(data));
            this._currentStep = this._iterator.next(data);
        }
        // done
        this.resetState();
        if (this._buffer.length > 0) {  // start new decode
            this._proceed()
        }
    }

}

function valueToIndex(buffer, val) {
    switch (typeof val) {
        case 'function':
            return val(buffer);
            break;
        case 'number':
            return val;
            break;
        case 'string':
            return valueToIndex(buffer, Buffer.from(val));
            break;
        case 'object':
            if (val.constructor !== Buffer) {
                throw new Error(`yield value ${val} (${val.constructor.name}) is not supported`);
            }
            if (buffer.length < val.length) {
                return -1;
            }
            const prefix = buffer.slice(0, val.length);
            if (prefix.equals(val)) {
                return val.length;
            }
            throw new Error('Expected buffer to contain ' + debugVal(val));
        default:
            throw new Error('Expected yield value to be one of ' +
                'function|number|string|Buffer, instead got ' +
                typeof val);
    }

}

function debugVal(val) {
    return JSON.stringify(val.toString());
}

module.exports = Decoder;
