/* eslint-env mocha */
/* eslint no-unused-expressions:0 */

// Module under test
const RecordKeeper = require("../../src/index");

// Support

// assertions library
const chai = require("chai");
const { expect } = require("chai");

// mocks and stubs
const sinon = require("sinon");

// chai plugin for assertino on sinon stuff
const sinonChai = require("sinon-chai");
chai.use(sinonChai);

describe("The base RecordLogger", () => {
    it("should filter out records whose verbosity is higher than the requested level", () => {
        const keeperUnderTest = new RecordKeeper();
        keeperUnderTest.recordValue("critical", "one", 1);
        keeperUnderTest.recordValue("important", "two", 10);
        keeperUnderTest.recordValue("unimportant", "three", 20);
        keeperUnderTest.recordValue("trivial", "four", 30);

        const records = keeperUnderTest.getRecords(10);

        expect(records).to.deep.equal({
            critical: "one",
            important: "two"
        });
    });

    it("should support recording multiple records at once", () => {
        const keeperUnderTest = new RecordKeeper();
        keeperUnderTest.recordValues(
            { c1: "one", c2: "two", shared: "CCC" },
            1
        );
        keeperUnderTest.recordValues(
            { i1: "three", i2: "four", shared: "III" },
            10
        );
        keeperUnderTest.recordValue("i2", "new four", 10);
        keeperUnderTest.recordValues(
            { u1: "five", u2: "six", shared: "UUU" },
            20
        );

        const records = keeperUnderTest.getRecords(10);

        expect(records).to.deep.equal({
            c1: "one",
            c2: "two",
            i1: "three",
            i2: "new four",
            shared: "III"
        });
    });

    it("should use the most verbose allowed value of a record", () => {
        const keeperUnderTest = new RecordKeeper();
        keeperUnderTest.recordValue("fieldName", "one", 1);
        keeperUnderTest.recordValue("fieldName", "two", 10);
        keeperUnderTest.recordValue("fieldName", "three", 20);

        expect(keeperUnderTest.getRecords(10)).to.deep.equal({
            fieldName: "two"
        });
        expect(keeperUnderTest.getRecords(1)).to.deep.equal({
            fieldName: "one"
        });
    });

    it("should only resolve lazy records when required", () => {
        const keeperUnderTest = new RecordKeeper();
        const spy1 = sinon.stub().returns("one");
        const spy10 = sinon.stub().returns("two");
        const spy20 = sinon.stub().returns("three");
        keeperUnderTest.recordLazy("fieldName", spy1, 1);
        keeperUnderTest.recordLazy("fieldName", spy10, 10);
        keeperUnderTest.recordLazy("fieldName", spy20, 20);

        const records = keeperUnderTest.getRecords(10);

        expect(records).to.deep.equal({
            fieldName: "two"
        });
        expect(spy1).to.not.have.been.called;
        expect(spy20).to.not.have.been.called;
    });

    it("should not invoke a lazy-loader supplier function more than once", () => {
        const keeperUnderTest = new RecordKeeper();
        const spy = sinon.stub().returns("value");
        keeperUnderTest.recordLazy("fieldName", spy, 20);

        expect(keeperUnderTest.getRecords(20)).to.deep.equal({
            fieldName: "value"
        });
        expect(spy).to.have.been.calledOnce;

        expect(keeperUnderTest.getRecords(10)).to.deep.equal({});
        expect(spy).to.have.been.calledOnce;

        expect(keeperUnderTest.getRecords(20)).to.deep.equal({
            fieldName: "value"
        });
        expect(spy).to.have.been.calledOnce;
    });

    it("should have an `at` method that provides a `recordValue` method", () => {
        const keeperUnderTest = new RecordKeeper();
        keeperUnderTest.at(10).recordValue("foo", "bar");
        expect(keeperUnderTest.getRecords(10)).to.deep.equal({ foo: "bar" });
        expect(keeperUnderTest.getRecords(1)).to.deep.equal({});
    });

    it("should have an `at` method that provides a `recordValues` method", () => {
        const keeperUnderTest = new RecordKeeper();
        keeperUnderTest.at(10).recordValues({ foo: "bar" });
        expect(keeperUnderTest.getRecords(10)).to.deep.equal({ foo: "bar" });
        expect(keeperUnderTest.getRecords(1)).to.deep.equal({});
    });

    it("should have an `at` method that provides a `recordLazy` method", () => {
        const keeperUnderTest = new RecordKeeper();
        keeperUnderTest.at(10).recordLazy("foo", () => "bar");
        expect(keeperUnderTest.getRecords(10)).to.deep.equal({ foo: "bar" });
        expect(keeperUnderTest.getRecords(1)).to.deep.equal({});
    });
});

describe("Named RecordKeepers", () => {
    const defineRecordKeeper = () =>
        RecordKeeper.define({
            critical: 1,
            important: 10,
            unimportant: 20,
            trivial: 30
        });

    it("should support named levels for recordValues", () => {
        const keeperUnderTest = new (defineRecordKeeper())();
        keeperUnderTest.recordValues({ a: "one", b: "two" }, "important");
        expect(keeperUnderTest.getRecords("important")).to.deep.equal({
            a: "one",
            b: "two"
        });
        expect(keeperUnderTest.getRecords("critical")).to.deep.equal({});
    });

    it("should have an `at` method which supports named levels", () => {
        const keeperUnderTest = new (defineRecordKeeper())();
        keeperUnderTest.at("important").recordValue("foo", "bar");
        expect(keeperUnderTest.getRecords("important")).to.deep.equal({
            foo: "bar"
        });
        expect(keeperUnderTest.getRecords("critical")).to.deep.equal({});
    });

    it("should hang methods for each level off of the `at` and `getRecords` methods", () => {
        const keeperUnderTest = new (defineRecordKeeper())();
        keeperUnderTest.at.important.recordValue("foo", "bar");
        expect(keeperUnderTest.getRecords.important()).to.deep.equal({
            foo: "bar"
        });
        expect(keeperUnderTest.getRecords.critical()).to.deep.equal({});
    });
});
