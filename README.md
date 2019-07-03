# record-keeper

A smarter logging practice: instead of leaving a trail of breadcrumbs in your logs,
use this to record a collection of named values that you care about, the values that
will help you understand whatever it is that you want to understand about your
execution. You can then dump the collection into your logs at the end of the execution,
all in one neat tidy little package, instead of splattered across countless lines of
logs interleaved with lines from concurrent executions.

## Overview

Install as you would expect, it's an javascript package published to npm:
`npm install --save record-keeper`.

Instantiate a `RecordKeeper`, and start adding records to it. Each record has a name,
a value, and a _verbosity_ level: how verbose do the logs need to be in order to include
this log (more on this below).

```javascript
const RecordKeeper = require("record-keeper");

const keeper = new RecordKeeper();

keeper.recordValue("foo", "some value", 10);
keeper.recordValue("bar", "some debug value", 50); // higher value means more verbose
```

Before your execution terminates, get the records, and dump them to your logs,
however you would normally log. Decide what level of verbosity you want to
include, and pass it to the `getRecords` method:

```javascript
// Will include any records that were added with a verbosity of 10 or less.
console.log(keeper.getValues(10));
```

## Records

A record is just a named value. It can be any javascript value. For logging purposes, you'll
probably want to use something that can be serialized to JSON or some other format, but
that's really between you and your logger.

## Verbosity

The basic premise here is that when your execution follows the happy path, you probably don't
need to know too much about the execution, you can use a relatively low verbosity. However, when
something goes wrong, you might want more data, so you want a higher verbosity.

When you add a record, you specify it's verbosity level. When you're ready to log the records,
you decide what level of verbosity you need, and ask for records that have that verbosity or lower.

For instance, if you define "DEBUG" to be a higher verbosity than "INFO", and "INFO" to be a higher
verbosity than "ERROR", then ask for records with verbosity "INFO", you'll get back any values that
were added with "INFO" or "ERROR", but not any that were added with "DEBUG": these are _more_ verbose
than what you asked for.

Verbosity isn't actually associated with a record, but with a value for a record. For instance, you
can add a record named "foo" with a high verbosity, giving it a value of
"really long string with lots of details", then add it again with a lower verbosity, giving it a value
of "summary". Then when you ask for records with the higher verbosity, you'll get the more detailed
value; when you ask for records with the lower verbosity, you'll get the summary value.

If you find "verbosity" to be unintuitive, you might try thinking of it as priority instead, where a
low value is a higher priority (e.g., a value of 1 is the number-one priority). High-priority records
are more like to be included in the logs.

## Lazy Values

Use the `recordLazy` method to add a _lazy value_: these are just like a regular record except
instead of giving the value of the record, you give a supplier function which can be used to get
the value. The supplier function will be invoked at most once, the first time that the value is
actually delivered through the `getRecords` function. The result of the supplier function will be
used as the value of the record, and will be cached for subsequent use of that record.

## Record Multiple

You can write multiple records to the same level using the `recordValues` method. Instead of taking
a record name and a value as two arguments, it takes an object whose own properties are used as
a dictionary of records to add.

## Named levels

You can create a subtype of `RecordTracker` using the `RecordTracker.define` function. It takes an
object/dictionary of named verbosity/priority levels and adds these as convenience methods to the
prototype. For instance:

```javascript
const MyTracker = RecordTracker.define({
    critical: 1,
    useful: 10,
    debug: 20
});
const tracker = new MyTracker();
tracker.at.critical.recordValue("input", "the input values");
tracker.at.useful.recordValue("output", "the result");
tracker.at.debug.recordValue("something", "that isn't very useful");

console.log(tracker.getRecords.useful()); // { input: ..., output: ... }
```
