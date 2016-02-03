/* global it */

var assert = require('assert');
var expressCo = require('./index')(require('express'));
var request = require('supertest');

it('should accept generator as middleware', function (done) {
	var app = expressCo();

	app.get('/', function* (req, res) {
		res.send('it works!');
	});

	request(app)
		.get('/')
		.end(function (err, res) {
			assert.ifError(err);
			assert.equal(res.text, 'it works!');
			done();
		});
});

it('should not call next middleware after res.send', function (done) {
	var app = expressCo();

	app.get('/', function* (req, res) {
		res.send('one');
	});

	app.get('/', function* (req, res) {
		res.send('two');
	});

	request(app)
		.get('/')
		.end(function (err, res) {
			assert.ifError(err);
			assert.equal(res.text, 'one');
			done();
		});
});

it('should accept old function as middleware', function (done) {
	var app = expressCo();

	app.get('/', function (req, res) {
		res.send('it works!');
	});

	request(app)
		.get('/')
		.end(function (err, res) {
			assert.ifError(err);
			assert.equal(res.text, 'it works!');
			done();
		});
});
