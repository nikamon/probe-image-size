
'use strict';


const assert   = require('assert');
const fs       = require('fs');
const path     = require('path');
const probe    = require('../');
const Readable = require('stream').Readable;


describe('probeStream', function () {
  it('should process an image (promise)', async function () {
    let file = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');

    let size = await probe(fs.createReadStream(file));

    assert.strictEqual(size.width, 367);
    assert.strictEqual(size.height, 187);
    assert.strictEqual(size.mime, 'image/jpeg');
  });

  it('should process an image (callback)', function (done) {
    let file = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');

    probe(fs.createReadStream(file), function (err, size) {
      assert.ifError(err);
      assert.strictEqual(size.width, 367);
      assert.strictEqual(size.height, 187);
      assert.strictEqual(size.mime, 'image/jpeg');
      done();
    });
  });

  it('should skip unrecognized files (promise)', async function () {
    let file = path.join(__dirname, 'fixtures', 'text_file.txt');

    await assert.rejects(
      async () => probe(fs.createReadStream(file)),
      /unrecognized file format/
    );
  });

  it('should skip unrecognized files (callback)', function (done) {
    let file = path.join(__dirname, 'fixtures', 'text_file.txt');

    probe(fs.createReadStream(file), function (err) {
      assert.strictEqual(err.message, 'unrecognized file format');
      done();
    });
  });

  it('should skip empty files', async function () {
    let file = path.join(__dirname, 'fixtures', 'empty.txt');

    await assert.rejects(
      async () => probe(fs.createReadStream(file)),
      /unrecognized file format/
    );
  });

  it('should fail on stream errors', async function () {
    await assert.rejects(
      async () => probe(require('from2')([ new Error('stream err') ])),
      /stream err/
    );
  });


  // Regression test: when processing multiple consecutive large chunks in
  // a single request, probe used to throw "write after error" message.
  //
  // The way this test works is: SVG parser parses spaces up to 64k,
  // and WEBP parser closes immediately after first chunk. Check that it doesn't
  // error out.
  //
  it.skip('should not fail when processing multiple large chunks', async function () {
    let stream = new Readable({
      read: function () {
        // > 16kB (so it will be split), < 64kB (SVG header size)
        let x = Buffer.alloc(20000);
        x.fill(0x20);
        this.push(x);
      }
    });

    await assert.rejects(
      async () => probe(stream),
      /unrecognized file format/
    );
  });
});
