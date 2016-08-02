'use strict';

const assert = require('assert');
const Decoder = require('../src/decoder');

describe('Decoder', () => {

    context('yield', () => {

        it('function => consume up to computed index', done => {
            const decoder = new Decoder(function*() {
                const result = yield buf => buf.indexOf('\n');
                assert.equal(result.toString(), 'hello world');
                assert.equal(decoder._buffer.toString(), '\nsmth');
                done();
            }, { autoRestart: false });
            decoder.decode(Buffer.from('hello'));
            decoder.decode(Buffer.from(' '));
            decoder.decode(Buffer.from('world'));
            decoder.decode(Buffer.from('\nsmth'));
        });

        it('number => consume specified length', done => {
            const decoder = new Decoder(function*() {
                const result = yield 5;
                assert.equal(result.toString(), '12345');
                assert.equal(decoder._buffer.toString(), '67');
                done();
            }, { autoRestart: false });
            decoder.decode(Buffer.from('123'));
            decoder.decode(Buffer.from('4'));
            decoder.decode(Buffer.from('567'));
        });

        it('string => consume specified string', done => {
            const decoder = new Decoder(function*() {
                const result = yield 'hello';
                assert.equal(result.toString(), 'hello');
                assert.equal(decoder._buffer.toString(), 'world');
                done();
            }, { autoRestart: false });
            decoder.decode(Buffer.from('h'));
            decoder.decode(Buffer.from('e'));
            decoder.decode(Buffer.from('l'));
            decoder.decode(Buffer.from('loworld'));
        });

        it('string => throw on no match (unhandled)', done => {
            const decoder = new Decoder(function*() {
                yield 'hello';
            }, { autoRestart: false });
            try {
                decoder.decode(Buffer.from('1234567'));
            } catch (e) {
                assert.ok(e.message);
                done();
            }
        });

        it('string => throw on no match (handled)', done => {
            const decoder = new Decoder(function*() {
                try {
                    yield 'hello';
                } catch (e) {
                    assert.ok(e.message);
                    yield '12345';
                    done();
                }
            }, { autoRestart: false });
            decoder.decode(Buffer.from('12345'));
        });

        it('Buffer => consume speficied (same as string)', done => {
            const decoder = new Decoder(function*() {
                const result = yield Buffer.from('hello');
                assert.equal(result.toString(), 'hello');
                done();
            }, { autoRestart: false });
            decoder.decode(Buffer.from('h'));
            decoder.decode(Buffer.from('e'));
            decoder.decode(Buffer.from('l'));
            decoder.decode(Buffer.from('lo'));
        });

    });

    context('yield*', () => {

        it('delegates to another iterator', done => {
            const messages = [];

            const decoder = new Decoder(function*() {
                yield* decodeGreeting();
                yield* decodeName();
                assert.equal(messages.join(' '), 'Hello Joe');
                done();
            }, { autoRestart: false });

            decoder.decode(Buffer.from('Hello Joe\n'));

            function* decodeGreeting() {
                messages.push(yield 'Hello');
                yield(' ');
            }

            function* decodeName() {
                messages.push(yield _ => _.indexOf('\n'));
                yield('\n');
            }

        });

    });

    context('state changing', () => {

        let messages = [];

        beforeEach(() => messages = []);

        it('should support changing current state via `use`', done => {
            const decoder = new Decoder(decodeGreeting);
            decoder.decode(Buffer.from('Hello '));
            decoder.use(decodeName);
            decoder.decode(Buffer.from('Jane\n'));
            assert.equal(messages.join(','), 'Hello,Jane');
            done();
        });

        it('should auto-restart by default', done => {
            const decoder = new Decoder(decodeGreeting);
            decoder.decode(Buffer.from('Hello '));
            decoder.use(decodeName);
            decoder.decode(Buffer.from('Jane\n'));
            decoder.decode(Buffer.from('Hello '));
            decoder.use(decodeName);
            decoder.decode(Buffer.from('Joe\n'));
            assert.equal(messages.join(','), 'Hello,Jane,Hello,Joe');
            done();
        });

        it('should not auto-restart if configured', done => {
            const decoder = new Decoder(decodeGreeting, { autoRestart: false });
            decoder.decode(Buffer.from('Hello '));
            decoder.decode(Buffer.from('Jane\n'));
            decoder.decode(Buffer.from('Hello '));
            decoder.decode(Buffer.from('Joe\n'));
            assert.equal(messages.join(','), 'Hello');
            decoder.restart(decodeName);
            assert.equal(messages.join(','), 'Hello,Jane');
            decoder.restart(decodeGreeting);
            assert.equal(messages.join(','), 'Hello,Jane,Hello');
            decoder.restart(decodeName);
            assert.equal(messages.join(','), 'Hello,Jane,Hello,Joe');
            done();
        });

        function* decodeGreeting() {
            messages.push(yield 'Hello');
            yield(' ');
        }

        function* decodeName() {
            messages.push(yield _ => _.indexOf('\n'));
            yield('\n');
        }

    });

});
