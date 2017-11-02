JSPath [![NPM Version](https://img.shields.io/npm/v/jspath.svg?style=flat-square)](https://www.npmjs.com/package/jspath) [![Build Status](https://img.shields.io/travis/dfilatov/jspath/master.svg?style=flat-square)](https://travis-ci.org/dfilatov/jspath/branches)
============

JSPath is a [domain-specific language (DSL)](https://en.wikipedia.org/wiki/Domain-specific_language) that enables you to navigate and find data within your JSON documents. Using JSPath, you can select items of JSON in order to retrieve the data they contain.

JSPath for JSON is like [XPath](https://en.wikipedia.org/wiki/XPath) for XML.

It's heavily optimized both for Node.js and modern browsers.

Table of Contents
-----------------
  * [Getting Started](#getting-started)
    * [In the Node.js](#in-the-nodejs)
    * [In the Browsers](#in-the-browsers)
  * [Usage](#usage)
    * [Quick example](#quick-example)
  * [Documentation](#documentation)
    * [Location path](#location-path)
    * [Predicates](#predicates)
    * [Object predicates](#object-predicates)
      * [Comparison operators](#comparison-operators)
      * [String comparison operators](#string-comparison-operators)
      * [Logical operators](#logical-operators)
      * [Arithmetic operators](#arithmetic-operators)
      * [Operator precedence](#operator-precedence)
    * [Positional predicates](#positional-predicates)
    * [Multiple predicates](#multiple-predicates)
    * [Substitutions](#substitutions)
    * [Result](#result)

Getting Started
---------------

### In the Node.js

You can install using Node Package Manager (npm):

    npm install jspath

### In the Browsers

```html
<script type="text/javascript" src="jspath.min.js"></script>
```
It also supports RequireJS module format and [YM module](https://github.com/ymaps/modules) format.

JSPath has been tested in IE6+, Mozilla Firefox 3+, Chrome 5+, Safari 5+, Opera 10+.

Usage
-----
```javascript
JSPath.apply(path, json[, substs]);
```
where:

parameter     |   data type        | description
------------- |   -------------    | -------------
`path`        | string             | [path expression](#documentation)
`json`        | any valid JSON     | input JSON document
`substs`      | object             | [substitutions (*optional*)](#substitutions)

### Quick example

```javascript
JSPath.apply(
    '.automobiles{.maker === "Honda" && .year > 2009}.model',
    {
        "automobiles" : [
            { "maker" : "Nissan", "model" : "Teana", "year" : 2011 },
            { "maker" : "Honda", "model" : "Jazz", "year" : 2010 },
            { "maker" : "Honda", "model" : "Civic", "year" : 2007 },
            { "maker" : "Toyota", "model" : "Yaris", "year" : 2008 },
            { "maker" : "Honda", "model" : "Accord", "year" : 2011 }
        ],
        "motorcycles" : [{ "maker" : "Honda", "model" : "ST1300", "year" : 2012 }]
    });
```
Result will be:
```javascript
['Jazz', 'Accord']
```

Documentation
-------------
A JSPath path expression consists of two types of top-level expressions:

 1. the required [location path](#location-path) and
 2. one or more optional [predicates](#predicates)

This means, a path expression like

```javascript
.automobiles{.maker === "Honda" && .year > 2009}.model
```

can be split into

the location path |  one predicate                           | and the continued location path
-------------     | -------------                            |  -------------
`.automobiles`    |  `{.maker === "Honda" && .year > 2009}`  | `.model`

### Location path

To select items in JSPath, you use a location path which consists of one or more location steps.

Every location step starts with one period (`.`) or two periods (`..`), depending on the item you're trying to select:

location step |  description
------------- | -------------
`.property`   | locates property immediately descended from context items
`..property`  | locates property deeply descended from context items
`.`           | locates context items itself

You can use the wildcard symbol (`*`) instead of exact name of property:

location step |  description
------------- | -------------
`.*`          | locates all properties immediately descended from the context items
`..*`         | locates all properties deeply descended from the context items

Property must be a sequence of alphanumerical characters including `_`, `$` and `@` symbols, that cannot start with a number.
If you need to locate properties containing any other characters, you have to quote them:

location step                                      |  description
-------------                                      | -------------
`."property with non-alphanumerical characters"`   | locates a property containing non-alphanumerical characters

Also JSPath allows to join several properties:

location step                                          |  description
-------------                                          | -------------
`(.property1 | .property2 | .propertyN)`               | locates `property1`, `property2`, `propertyN` immediately descended from context items
`(.property1 | .property2.property2_1.property2_1_1)`  | locates `.property1`, `.property2.property2_1.property2_1_1` immediately descended from context items

Location paths can be absolute or relative.
If location path starts with the caret (`^`) you are using an absolute location path. This syntax is used to locate a property when another context is already used in the location path and/or the object predicates.

Consider the following JSON:

```javascript
var doc = {
    "books" : [
        {
            "id"     : 1,
            "title"  : "Clean Code",
            "author" : { "name" : "Robert C. Martin" },
            "price"  : 17.96
        },
        {
            "id"     : 2,
            "title"  : "Maintainable JavaScript",
            "author" : { "name" : "Nicholas C. Zakas" },
            "price"  : 10
        },
        {
            "id"     : 3,
            "title"  : "Agile Software Development",
            "author" : { "name" : "Robert C. Martin" },
            "price"  : 20
        },
        {
            "id"     : 4,
            "title"  : "JavaScript: The Good Parts",
            "author" : { "name" : "Douglas Crockford" },
            "price"  : 15.67
        }
    ]
};
```

#### Examples

```javascript
// find all books authors
JSPath.apply('.books.author', doc);
/* [{ name : 'Robert C. Martin' }, { name : 'Nicholas C. Zakas' }, { name : 'Robert C. Martin' }, { name : 'Douglas Crockford' }] */

// find all books author names
JSPath.apply('.books.author.name', doc);
/* ['Robert C. Martin', 'Nicholas C. Zakas', 'Robert C. Martin', 'Douglas Crockford' ] */

// find all names in books
JSPath.apply('.books..name', doc);
/* ['Robert C. Martin', 'Nicholas C. Zakas', 'Robert C. Martin', 'Douglas Crockford' ] */
```

### Predicates

JSPath predicates allow you to write very specific rules about items you'd like to select when constructing your path expression. Predicates are filters that restrict the items selected by the location path. There are two possible types of predicates: [object](#object-predicates) and [positional predicates](#positional-predicates).

### Object predicates

Object predicates can be used in a path expression to filter a subset of items according to boolean expressions working on the properties of each item. All object predicates are parenthesized by curly brackets (`{` and `}`).

In JSPath these basic expressions can be used inside an object predicate:
  * numeric literals (e.g. `1.23`)
  * string literals (e.g. `"John Gold"`)
  * boolean literals (`true` and `false`)
  * subpaths (e.g. `.nestedProp.deeplyNestedProp`)
  * nested predicates (e.g. `.prop{.nestedProp{.deeplyNestedProp{.stillMore || .yetAnother} || .otherDeeplyNested}}`

Furthermore, the following types of operators are valid inside an object predicate:
  * [comparison operators](#comparison-operators)
  * [string comparison operators](#string-comparison-operators)
  * [logical operators](#logical-operators)
  * [arithmetic operators](#arithmetic-operators)

#### Comparison operators

operator      |  description                                  | example
------------- | -------------                                 | -------------
`==`          | returns `true` if both operands are equal     | `.books{.id == "1"}`
`===`         | returns `true` if both operands are strictly equal with no type conversion   | `.books{.id === 1}`
`!=`          | returns `true` if the operands are not equal    | `.books{.id != "1"}`
`!==`         | returns `true` if the operands are not equal and_or not of the same data type  | `.books{.id !== 1}`
`>`           | returns `true` if the left operand is greater than the right operand    | `.books{.id > 1}`
`>=`          | returns `true` if the left operand is greater than or equal to the right operand  | `.books{.id >= 1}`
`<`           | returns `true` if the left operand is smaller than the right operand    | `.books{.id < 1}`
`<=`          | returns `true` if the left operand is smaller than or equal to the right operand  | `.books{.id <= 1}`

JSPath uses the following rules to compare arrays and objects of different types:
  * if both operands to be compared are arrays, then the comparison will be
true if there is an element in the first array and an element in the
second array such that the result of performing the comparison of two elements is true
  * if one operand is array and another is not, then the comparison will be true if there is element in
array such that the result of performing the comparison of element and another operand is true
  * primitives to be compared as usual javascript primitives

#### String comparison operators

If both operands are strings, there're also available additional comparison operators:

operator      |  description                                  | example
------------- | -------------                                 | -------------
`==`          | returns `true` if both strings are equal   | `.books{.title == "clean code"}`
`^==`         | case sensitive; returns `true` if the left operand starts with the right operand  | `.books{.title ^== "Javascript"}`
`^=`          | case insensitive; returns `true` if the left operand starts with the right operand  | `.books{.title ^= "javascript"}`
`$==`         | case sensitive; returns `true` if left operand ends with the right operand  | `.books{.title $== "Javascript"}`
`$=`          | case insensitive; returns `true` if left operand ends with the right operand    | `.books{.title $= "javascript"}`
`*==`          | case sensitive; returns `true` if left operand contains right operand  | `.books{.title *== "Javascript"}`
`*=`           | case insensitive; returns `true` if left operand contains right operand    | `.books{.title *= "javascript"}`

#### Logical operators

operator      |  description                                  | example
------------- | -------------                                 | -------------
`&&`          | returns `true` if both operands are `true`   | `.books{.price > 19 && .author.name === "Robert C. Martin"}`
`||`          | returns `true` if either or both operands are `true`  	  | `.books{.title === "Maintainable JavaScript" || .title === "Clean Code"}`
`!`          | returns `true` if operand is false 	 | `.books{!.title}`

In JSPath logical operators convert their operands to boolean values using following rules:

  * if an operand is an array with a length greater than `0`, the result will be `true` else `false`
  * a casting with double NOT javascript operator (`!!`) is used in any other cases

#### Arithmetic operators

operator      |  description
------------- | -------------
`+`          | addition
`-`          | subtraction
`*`          | multiplication
`/`          | division
`%`          | modulus

#### Operator precedence#

precedence    |  operator
------------- | -------------
1 (highest)   | `!`, unary `-`
2             | `*`, `/`, `%`
3             | `+`, binary `-`
4             | `<`, `<=`, `>`, `>=`
5             | `==`, `===`, `!=`, `!==`, `^=`, `^==`, `$==`, `$=`, `*=`, `*==`
6             | `&&`
7 (lowest )   | `||`

Parentheses (`(` and `)`) are used to explicitly denote precedence by grouping parts of an expression that should be evaluated first.

#### Examples

```javascript
// find all book titles whose author is Robert C. Martin
JSPath.apply('.books{.author.name === "Robert C. Martin"}.title', doc);
/* ['Clean Code', 'Agile Software Development'] */

// find all book titles with price less than 17
JSPath.apply('.books{.price < 17}.title', doc);
/* ['Maintainable JavaScript', 'JavaScript: The Good Parts'] */
```

### Positional predicates

Positional predicates allow you to filter items by their context position. All positional predicates are parenthesized by square brackets (`[` and `]`).

JSPath supports four types of positional predicates – also known as slicing methods:

operator      |  description                                  | example
------------- | -------------                                 | -------------
`[index]`  | returns item in context at index `index` – the first item has index `0`, positional predicates are zero-based    | `[3]` returns fourth item in context
`[start:]`    | returns range of items whose index in context is greater or equal to `start`   |  `[2:]` returns items whose index is greater or equal to `2`
`[:end]`    | returns range of items whose index in context is smaller than `end`    | `[:5]` returns first five items in context
`[start:end]`         | returns range of items whose index in context is greater or equal to `start` and smaller than `end` | `[2:5]` returns three items on the indices `2`, `3` and `4`

`index`, `start` or `end` may be a negative number, which means JSPath counts from the end instead of the beginning:

example      |  description
------------- | -------------
`[-1]`     | returns last item in context
`[-3:]`    | returns last three items in context


#### Examples

```javascript
// find first book title
JSPath.apply('.books[0].title', doc);
/* ['Clean Code'] */

// find first title of books
JSPath.apply('.books.title[0]', doc);
/* 'Clean Code' */

// find last book title
JSPath.apply('.books[-1].title', doc);
/* ['JavaScript: The Good Parts'] */

// find two first book titles
JSPath.apply('.books[:2].title', doc);
/* ['Clean Code', 'Maintainable JavaScript'] */

// find two last book titles
JSPath.apply('.books[-2:].title', doc);
/* ['Agile Software Development', 'JavaScript: The Good Parts'] */

// find two book titles from second position
JSPath.apply('.books[1:3].title', doc);
/* ['Maintainable JavaScript', 'Agile Software Development'] */
```

### Multiple predicates

You can use more than one predicate – any combination of [object](#object-predicates) and [positional predicates](#positional-predicates). The result will contain only items that match all predicates.

#### Examples

```javascript
// find first book name whose price less than 15 and greater than 5
JSPath.apply('.books{.price < 15}{.price > 5}[0].title', doc);
/* ['Maintainable JavaScript'] */
```

### Nested predicates

You can nest predicates as deeply as you like — saves having to repeat deep subpaths each time, shortening query length. Similar to JavaScript's "with" operator, all properties of the object become first-level properties inside the nested predicate.

#### Examples

```javascript
// long subpaths: find books by various authors, for under $20
JSPath.apply('.books{.price < 20 && (.author.name *== "Zakas" || .author.name *== "Martin")}.title', doc);
/* ['Clean Code', 'Maintainable JavaScript'] */

// nested predicates: same query, however ".author.name" isn't repeated. For JSON with many levels, enables much more compact queries.
JSPath.apply('.books{.price < 20 && .author{.name *== "Zakas" || .name *== "Martin"}}.title', doc);
/* ['Clean Code', 'Maintainable JavaScript'] */
```

### Substitutions

Substitutions allow you to use runtime-evaluated values in predicates and pathes (as a path root).

#### Examples

```javascript
var path = '.books{.author.name === $author}.title';

// find book name whose author Nicholas C. Zakas
JSPath.apply(path, doc, { author : 'Nicholas C. Zakas' });
/* ['Maintainable JavaScript'] */

// find books name whose authors Robert C. Martin or Douglas Crockford
JSPath.apply(path, doc, { author : ['Robert C. Martin', 'Douglas Crockford'] });
/* ['Clean Code', 'Agile Software Development', 'JavaScript: The Good Parts'] */
```

### Result

If the last predicate in an expression is a positional predicate using an index (e.g. `[0]`, `[5]`, `[-1]`), the result is the item at the specified index or `undefined` if the index is out of range.
In any other cases the result of applying `JSPath.apply()` is always an array – empty (`[]`), if found nothing.
