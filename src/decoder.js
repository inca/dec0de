'use strict';

const debug = require('debug')('dec0de:decoder');
const assert = require('assert');

class Decoder {

    constructor(generator) {
        this._generator = generator;
        this._buffer = Buffer.alloc(0);
        this.reset();
    }

    use(gen, ...args) {
        if (gen.next) {
            this._iterator = gen;
        } else {
            this._iterator = gen(...args);
        }
    }

    reset() {
        this._currentStep = null;
        this.use(this._generator);
    }

    decode(newBuffer) {
        assert(this._iterator, 'decoder not initialized ' +
            '(make sure you call `use` before `decode`)');
        this._buffer = Buffer.concat([this._buffer, newBuffer]);
        this._decodeNext();
    }

    _decodeNext() {
        return this._currentStep ? this._proceed() : this._start();
    }

    _onMatch(data) {
        debug('match', data.length);
        this._currentStep = this._iterator.next(data);
        this._proceed();
    }

    _start() {
        this._onMatch(Buffer.alloc(0));
    }

    _proceed() {
        const step = this._currentStep;
        if (step.done) {
            this.reset();
            if (this._buffer.length) {
                this._start()
            }
            return;
        }
        const i = valueToIndex(this._buffer, step.value);
        if (i < 0 || this._buffer.length < i) {
            return;
        }
        const data = this._buffer.slice(0, i);
        this._buffer = this._buffer.slice(i);
        this._onMatch(data);
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
            throw new Error('Expected buffer to contain ' + debugVal())
        default:
            throw new Error('Expected yield value to be one of ' +
                'function|number|string|Buffer, instead got ' +
                typeof val);
    }

    function debugVal() {
        return JSON.stringify(val.toString());
    }
}

module.exports = Decoder;
