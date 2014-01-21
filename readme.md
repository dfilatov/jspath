JSPath [![NPM version](https://badge.fury.io/js/jspath.png)](http://badge.fury.io/js/jspath) [![Build Status](https://secure.travis-ci.org/dfilatov/jspath.png)](http://travis-ci.org/dfilatov/jspath)
============

JSPath is a domain-specific language (DSL) that enables you to navigate and find data within your JSON documents. Using JSPath, you can select items of JSON in order to retrieve the data they contain.

JSPath for JSON is like an XPath for XML.

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
###In the Node.js###
You can install using Node Package Manager (npm):

    npm install jspath

###In the Browsers###
```html
<script type="text/javascript" src="jspath.min.js"></script>
```
It also supports RequireJS module format and [YM module](https://github.com/ymaps/modules) format.

JSPath has been tested in IE6+, Mozilla Firefox 3+, Chrome 5+, Safari 5+, Opera 10+.

Usage
-----
```javascript
JSPath.apply(path, json);
// or
JSPath.apply(path, json, substs);
```
where:
<table>
  <tr>
    <th></th>
    <th>type</th>
    <th>description</th>
  <tr>
    <td>path</td>
    <td>String</td>
    <td>path expression</td>
  </tr>
  <tr>
    <td>json</td>
    <td>any valid JSON</td>
    <td>input JSON document</td>
  </tr>
  <tr>
    <td>substs</td>
    <td>Object</td>
    <td>substitutions (optional)</td>
  </tr>
</table>

###Quick example###
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
JSPath expression consists of two type of top-level expressions: location path (required) and predicates (optional).

###Location path###
To select items in JSPath, you use a location path.
A location path consists of one or more location steps.
Every location step starts with dot (.) or two dots (..) depending on the item you're trying to select:
  * .property &mdash; locates property immediately descended from context items
  * ..property &mdash; locates property deeply descended from context items
  * . &mdash; locates context items itself

You can use the wildcard symbol (*) instead of exact name of property:
  * .* &mdash; locates all properties immediately descended from the context items
  * ..* &mdash; locates all properties deeply descended from the context items  

Also JSPath allows to join several properties:
  * (.property1 | .property2 | .propertyN) &mdash; locates property1, property2, propertyN immediately descended from context items
  * or even (.property1 | .property2.property2_1.property2_1_1) &mdash; locates .property1, .property2.property2_1.property2_1_1 items

Your location path can be absolute or relative.
If location path starts with the root (^) you are using an absolute location path &mdash; your location path begins from the root items.

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

####Examples####
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

###Predicates###
JSPath predicates allow you to write very specific rules about items you'd like to select when constructing your expressions.
Predicates are filters that restrict the items selected by location path. There're two possible types of predicates: object and positional.

###Object predicates###
Object predicates can be used in a path expression to filter a subset of items according to a boolean expressions working on a properties of each item.
Object predicates are embedded in braces.

Basic expressions in object predicates:
  * numeric literals (e.g. 1.23)
  * string literals (e.g. "John Gold")
  * boolean literals (true/false)
  * subpathes (e.g. .nestedProp.deeplyNestedProp)

JSPath allows to use in predicate expressions following types of operators:
  * comparison operators
  * string comparison operators
  * logical operators
  * arithmetic operators

####Comparison operators####

<table>
  <tr>
    <td>==</td>
    <td>Returns is true if both operands are equal</td>
    <td>.books{.id == "1"}</td>
  </tr>
  <tr>
    <td>===</td>
    <td>Returns true if both operands are strictly equal with no type conversion</td>
    <td>.books{.id === 1}</td>
  </tr>
  <tr>
    <td>!=</td>
    <td>Returns true if the operands are not equal</td>
    <td>.books{.id != "1"}</td>
  </tr>
  <tr>
    <td>!==</td>
    <td>Returns true if the operands are not equal and/or not of the same type</td>
    <td>.books{.id !== 1}</td>
  </tr>
  <tr>
    <td>></td>
    <td>Returns true if the left operand is greater than the right operand</td>
    <td>.books{.id > 1}</td>
  </tr>
  <tr>
    <td>>=</td>
    <td>Returns true if the left operand is greater than or equal to the right operand</td>
    <td>.books{.id >= 1}</td>
  </tr>
  <tr>
    <td>&lt;</td>
    <td>Returns true if the left operand is less than the right operand</td>
    <td>.books{.id &lt; 1}</td>
  </tr>
  <tr>
    <td>&lt;=</td>
    <td>Returns true if the left operand is less than or equal to the right operand</td>
    <td>.books{.id &lt;= 1}</td>
  </tr>
</table>

Comparison rules:
  * if both operands to be compared are arrays, then the comparison will be
true if there is an element in the first array and an element in the
second array such that the result of performing the comparison of two elements is true
  * if one operand is array and another is not, then the comparison will be true if there is element in
array such that the result of performing the comparison of element and another operand is true
  * primitives to be compared as usual javascript primitives

If both operands are strings, there're also available additional comparison operators:
####String comparison operators####
<table>
  <tr>
    <td>==</td>
    <td>Like an usual '==' but case insensitive</td>
    <td>.books{.title == "clean code"}</td>
  </tr>
  <tr>
    <td>^==</td>
    <td>Returns true if left operand value beginning with right operand value</td>
    <td>.books{.title ^== "Javascript"}</td>
  </tr>
  <tr>
    <td>^=</td>
    <td>Like the '^==' but case insensitive</td>
    <td>.books{.title ^= "javascript"}</td>
  </tr>
  <tr>
    <td>$==</td>
    <td>Returns true if left operand value ending with right operand value</td>
    <td>.books{.title $== "Javascript"}</td>
  </tr>
  <tr>
    <td>$=</td>
    <td>Like the '$==' but case insensitive</td>
    <td>.books{.title $= "javascript"}</td>
  </tr>
  <tr>
    <td>*==</td>
    <td>Returns true if left operand value contains right operand value</td>
    <td>.books{.title *== "Javascript"}</td>
  </tr>
  <tr>
    <td>*=</td>
    <td>Like the '*==' but case insensitive</td>
    <td>.books{.title *= "javascript"}</td>
  </tr>
</table>

####Logical operators####

<table>
  <tr>
    <td>&&</td>
    <td>Returns true if both operands are true</td>
    <td>.books{.price > 19 && .author.name === "Robert C. Martin"}</td>
  </tr>
  <tr>
    <td>||</td>
    <td>Returns true if either operand is true</td>
    <td>.books{.title === "Maintainable JavaScript" || .title === "Clean Code"}</td>
  </tr>
  <tr>
    <td>!</td>
    <td>Returns true if operand is false</td>
    <td>.books{!.title}</td>
  </tr>
</table>

Logical operators convert their operands to boolean values using next rules:
  * if operand is array (as you remember result of applying subpath is also array):
    * if length of array greater than zero, result will be true
    * else result will be false
  * Casting with double NOT (!!) javascript operator to be used in any other cases.

####Arithmetic operators####

<table>
  <tr>
    <td>+</td>
    <td>addition</td>
  </tr>
  <tr>
    <td>-</td>
    <td>subtraction</td>
  </tr>
  <tr>
    <td>*</td>
    <td>multiplication</td>
  </tr>
  <tr>
    <td>/</td>
    <td>division</td>
  </tr>
  <tr>
    <td>%</td>
    <td>modulus</td>
  </tr>
</table>

####Operator precedence####
<table>
  <tr>
    <td>1 (top)</td>
    <td>! -<sup>unary</sup></td>
  </tr>
  <tr>
    <td>2</td>
    <td>* / %</td>
  </tr>
  <tr>
    <td>3</td>
    <td>+ -<sup>binary</sup></td>
  </tr>
  <tr>
    <td>4</td>
    <td>< <= > >=</td>
  </tr>
  <tr>
    <td>5</td>
    <td>== === != !== ^= ^== $== $= *= *==</td>
  </tr>
  <tr>
    <td>6</td>
    <td>&&</td>
  </tr>
  <tr>
    <td>7</td>
    <td>||</td>
  </tr>
</table>

Parentheses are used to explicitly denote precedence by grouping parts of an expression that should be evaluated first.

####Examples####
```javascript
// find all book titles whose author is Robert C. Martin
JSPath.apply('.books{.author.name === "Robert C. Martin"}.title', doc);
/* ['Clean Code', 'Agile Software Development'] */

// find all book titles with price less than 17
JSPath.apply('.books{.price < 17}.title', doc);
/* ['Maintainable JavaScript', 'JavaScript: The Good Parts'] */
```

###Positional predicates###
Positional predicates allow you to filter items by their context position.
Positional predicates are always embedded in square brackets.

There are four available forms:
  * [ ````index````] &mdash; returns ````index````-positioned item in context (first item is at index 0), e.g. [3] returns fourth item in context
  * [````index````:] &mdash; returns items whose index in context is greater or equal to ````index````, e.g. [2:] returns items whose index in context is greater or equal to 2
  * [:````index````] &mdash; returns items whose index in context is smaller than ````index````, e.g. [:5] returns first five items in context
  * [````indexFrom````:````indexTo````] &mdash; returns items whose index in context is greater or equal to ````indexFrom```` and smaller than ````indexTo````, e.g. [2:5] returns three items with indices 2, 3 and 4

Also you can use negative position numbers:
  * [-1] &mdash; returns last item in context
  * [-3:] &mdash; returns last three items in context

####Examples####
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

###Multiple predicates###
You can use more than one predicate. The result will contain only items that match all the predicates.

####Examples####
```javascript
// find first book name whose price less than 15 and greater than 5
JSPath.apply('.books{.price < 15}{.price > 5}[0].title', doc);
/* ['Maintainable JavaScript'] */
```

###Substitutions###
Substitutions allow you to use runtime-evaluated values in predicates.

####Examples####
```javascript
var path = '.books{.author.name === $author}.title';

// find book name whose author Nicholas C. Zakas
JSPath.apply(path, doc, { author : 'Nicholas C. Zakas' });
/* ['Maintainable JavaScript'] */

// find books name whose authors Robert C. Martin or Douglas Crockford
JSPath.apply(path, doc, { author : ['Robert C. Martin', 'Douglas Crockford'] });
/* ['Clean Code', 'Agile Software Development', 'JavaScript: The Good Parts'] */
```

###Result###
Result of applying JSPath is always an array (empty, if found nothing), excluding case when the last predicate in top-level expression is a positional predicate with the exact index (e.g. [0], [5], [-1]).
In this case, result is an item at the specified index (````undefined```` if item hasn't found).
