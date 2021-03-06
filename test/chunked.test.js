'use strict';

const assert = require('assert');
const Decoder = require('../src/decoder');
const { EventEmitter } = require('events');
const { readFileSync } = require('fs');
const { join } = require('path');

describe('chunked-encoding decoder', () => {

    context('all data buffered', () => {

        const out = new EventEmitter();
        const chunks = [];

        before(done => {
            out.on('chunk', chunk => chunks.push(chunk.toString()));
            out.on('end', done);
            const buf = readFileSync(join(__dirname, './assets/chunked.txt'));
            createChunkedDecoder(out).decode(buf);
        });

        it('should parse chunks', () => {
            assert.equal(chunks.length, 2);
            assert.equal(chunks[0], 'Hello world');
            assert.equal(chunks[1], 'Awesome!');
        });

    });

    context('char-by-char (sync)', () => {

        const out = new EventEmitter();
        const chunks = [];

        before(done => {
            const decoder = createChunkedDecoder(out);
            out.on('chunk', chunk => chunks.push(chunk.toString()));
            out.on('end', done);
            const buf = readFileSync(join(__dirname, './assets/chunked.txt'));
            for (let i = 0; i < buf.length; i++) {
                decoder.decode(buf.slice(i, i + 1));
            }
        });

        it('should parse chunks', () => {
            assert.equal(chunks.length, 2);
            assert.equal(chunks[0], 'Hello world');
            assert.equal(chunks[1], 'Awesome!');
        });

    });

    context('char-by-char (async)', () => {

        const out = new EventEmitter();
        const chunks = [];

        before(done => {
            let flow = Promise.resolve();
            const decoder = createChunkedDecoder(out);
            out.on('chunk', chunk => chunks.push(chunk.toString()));
            out.on('end', done);
            const buf = readFileSync(join(__dirname, './assets/chunked.txt'));
            for (let i = 0; i < buf.length; i++) {
                flow = flow.then(() => decoder.decode(buf.slice(i, i + 1)));
            }
        });

        it('should parse chunks', () => {
            assert.equal(chunks.length, 2);
            assert.equal(chunks[0], 'Hello world');
            assert.equal(chunks[1], 'Awesome!');
        });
    });

});

function createChunkedDecoder(out) {

    return new Decoder(function* readChunk() {
        // Read chunk length up to newline
        const lenBuf = yield b => b.indexOf('\n');
        const len = parseInt(lenBuf.toString(), 16);
        // Consume newline
        yield '\n';
        if (len === 0) {
            out.emit('end');
        } else {
            // Read chunk of known length
            const chunk = yield len;
            // Consume newline
            yield '\n\n';
            // Emit it
            out.emit('chunk', chunk);
        }
    });

}
