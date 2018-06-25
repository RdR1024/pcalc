.. pcalc documentation master file, created by
   sphinx-quickstart on Fri Jun 22 15:19:03 2018.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Welcome to pcalc's source code documentation!
=============================================

.. toctree::
   :maxdepth: 2
   :caption: Contents:

Overview
--------

The pcalc module (`pcalc.js`) is actually a pre-packaged .js file that contains three major (sub-) modules. The first is a wrapper that provides the main (html) interface to the calculator.  This interface is intended to be very loosely coupled with any actual HTML page you might have.  Your HTML page simply feeds the html content as a string to :func:`calcvars`, which will do the calculation of any formulas (inside backticks) in the html content and returns a modified html string for you to display.  The modified html string will have placed the formulas inside `<code class="pcalc"><span class="formula.">...</span><span class="result.">...</span></code>` tags. You can find details on tag structure in the :func:`tickconvert` documentation.

The other functions in the wrapper section (i.e. :func:`calcs`, :func:`sortfs`, :func:`height`, :func:`tickconvert`, and :func:`highlight` ) are mainly there to support :func:`calcvars`.  There is also a function (i.e. :func:`resetcode`) that removes the `<code>` tags and calculation results and restores formulas to be inside the original backticks.  The :func:`sortfs` function (and its sub-function :func:`height`) are worth noting, because they put probability formulas in the right order for calculation.  With probability formulas, you have to make sure that you evaluate the formulas with conditions (i.e. dependencies on other variables) in the right order of dependency.  For example, suppose you have the following formulas:

    `pr Y given X is 50%`

    `pr X is 20%`

You have to evaluate the last formula first, because Y depends on having a value for X.  The :func:`sortfs` performs this task. One more point worth noting is that :func:`sorfs` also constructs a global object called `Dlist` which contains all the variables from all the formulas and has a simple dependency list for each.  For example, if the text contains the following formulas, `pr X=0.5`, `pr Y given X = 0.2` and `pr Z given X or Y = 0.5`, then `Dlist` will contain the following:

    { "X":null, "Y":["X"], "Z":["X","Y"] }


The next major section starts with the function :func:`pcalc` and comprises the formula interpreter. This formula interpreter is called for every formula in the html content, from the function :func:`calcs` in the wrapper section.  The formula interpreter will use "assignment formulas" to update an object (typically called "U") which ultimately contains the probability network variables and their definitions.  This object is then used later to calculate the results of formulas.  Even though :func:`pcalc` only interpretes one formula at the time, the `U` object stores or updates any variable assignments.  This way, successive calls to :func:`pcalc` will incrementally build the probability network in `U`. The wrapper section initialises `U`, which is by default not global.  However, for debugging, `U` can easily be made a global object (see the commented out lines in :func:`calcvars`).


Overview of the interpreter sub-module
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The function :func:`pcalc` is essentially the start of a recursive descent interpreter that translates the formulas into a more easily computable structure, which is passed to the third major sub-module, which is the computational engine for probability networks (more on that later).  We can play with :func:`pcalc` from the node commandline (or the browser console), as long as we pass it a "User space" object.  An empty object can be defined on the commandline as follows:

    **>** var U = { id:"my space", nonp:{} }

We can then apply :func:`pcalc`, for example:

    **>** pcalc('pr X=50%',U)

We then see that the probability variable has been added to `U`:

    **>** U

    // result is:

    { id: 'my space', nonp: {}, X: { true: 0.5 } }

In case you're wondering what the `nonp` is for:  it holds non-probabilistic variables.  For example,

    **>** pcalc('X = 3',U)

    **>** U

    // result is:

    { id: 'my space', nonp: { X: 3 }, X: { true: 0.5 } }

    **>** pcalc('1+2*X',U)

    // result is:

    7

From the examples above, it should be clear that the "wrapper" section of `pcalc.js` mostly extracts a list of formulas from the html content and passes each formula to :func:`pcalc`, together with a user space object that will hold all the probability variable definitions (as well as any non-probability variables, but we'll ignore that for the moment).  Here is an example of how to construct a probability network from the commandline, using :func:`pcalc`:

.. code-block:: js

     var W = { id:"wet grass", nonp:{} }
     pcalc("pr Rain=20%", W)
     pcalc("pr Sprinkler given Rain=1%", W)
     pcalc("pr Sprinkler given not Rain=40%", W)
     pcalc("pr WetGrass given not Sprinkler and not Rain = 0%", W)
     pcalc("pr WetGrass given not Sprinkler and Rain = 80%", W)
     pcalc("pr WetGrass given Sprinkler and not Rain = 90%", W)
     pcalc("pr WetGrass given Sprinkler and Rain = 99%", W)
..


We can then inspect the probability network (i.e. Bayes net) created in `W`. We'll use the `print.js` utility to see the unabbreviated content:

.. code-block:: js

     .load print.js
     print(W)

    // result is:

    { id: 'wet grass',
        nonp: {},
        Rain: { true: 0.2 },
        Sprinkler: { '#': [ [ 0.01, 'Rain' ], [ 0.4, [ 'not', 'Rain' ] ] ] },
        WetGrass: 
            { '#': 
                [ [ 0, [ 'and', [ 'not', 'Sprinkler' ], [ 'not', 'Rain' ] ] ],
                [ 0.8, [ 'and', [ 'not', 'Sprinkler' ], 'Rain' ] ],
                [ 0.9, [ 'and', 'Sprinkler', [ 'not', 'Rain' ] ] ],
                [ 0.99, [ 'and', 'Sprinkler', 'Rain' ] ] ] } 
    }
..


The resulting user space object is a straight-forward javascript object.  It could be created manually, or perhaps imported via JSON.  The object structure also shows much of how probability formulas are represented internally.  Essentially, the logic component of a formula is represented using operator-prefix lists.  For example, ["and","X","Y","Z"] represents the conjunction of X,Y and Z.  We'll come back to that in the evaluation sub-module, but for now we'll note that the interpreter simply translates more conventially written formulas into this internal structure.

Note that the :func:`pcalc` interpreter doesn't only interpret probability formulas, but can handle basic arithmetic as well.  For example, try `pcalc("1+2*3",U)`.

The recursive descent interpreter consists of a collection of functions, each of which looks at the next token(s) in the list and decides if those tokens match what the function is looking for.  The result of each function is returned in this general structure: 

.. code-block:: js

    {err: ErrorStatus, val: ValueOfTheInterpretation, tail: RestOfTheTokens}


The interpreter will evaluate the expressions it's given and return a result back to the top level function (i.e. :func:`pcalc`).  However, the as far as probability formulas is concerned, the interpreter is a "lazy interpreter" -- it waits until the last possible moment to evaluate the formula.  In fact, there are only two functions where that evaluation takes place: :func:`pexpression` and :func:`vgiven`, both of which call the function :func:`prob` after they get the result from the expression parser :func:`pexp`.  

You can play around with probability formulas (the logic part) without actually evaluating them. Try the following:

.. code-block:: js

    print( pexp(["X",and,"Y",or,not,"Z"],"") )

    // result is:
    { err: false,
      val: [ 'and', 'X', [ 'or', 'Y', [ 'not', 'Z' ] ] ],
      tail: [] }


Overview of the probability calculator sub-module
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Once the interpreter has translated the probability formula into the internal operator-prefix structure, and updated the user space with the variable assignments, we can calculate probability results with the :func:`prob` function.  This function requires a formula in prefix notation and a user space object and returns the resulting probability.  Note that there is one intermediate step necessary before we can use a user space object.  That is, we need to run the :func:`completor` function over the user space object, to ensure that all the conditional variables in the probability network have a _complete_ set of conditions.  If the conditions are only partially defined, then the :func:`completor` function will detect that and apply the "noisy-or" algorithm to try and complete the conditions.  The "noisy-or" algorithm essentially calculates for each combination of dependent variables the negation of the product of negated positive dependent variables.  For example, assume that we have defined the following probability network:

.. code-block:: js

    var mynet = {id:"mynet",
        X: {true: 0.2},
        Y: {true: 0.8},
        Z: {"#": [  [0.9, "X"], [0.1, "Y"] ]}
    }

Notice that the conditions of "Z" are combinatorially incomplete.  For instance, there is no definition for the conditional probability of "Z" when "X" is true, but "Y" is false.  The function :func:`completor` will detect that and apply the "noisy-or" algorithm.  At the node command line (after loading pcalc.js), enter the above probability network and then try the following:

.. code-block:: js

    completor(mynet)
    print(mynet)

    // result is (numbers rounded for readability): 

    {   id: 'mynet',
        X: { true: 0.2 },
        Y: { true: 0.8 },
        Z: { '#': 
            [ [ 0, [ 'and', [ 'not', 'X' ], [ 'not', 'Y' ] ] ],
            [ 0.01, [ 'and', [ 'not', 'X' ], 'Y' ] ],
            [ 0.9, [ 'and', 'X', [ 'not', 'Y' ] ] ],
            [ 0.91, [ 'and', 'X', 'Y' ] ] ],
            vars: [ 'X', 'Y' ],
            probs: [ 0, 0.01, 0.9, 0.91 ] },
        vars: [ 'X', 'Y', 'Z' ] }


Once the probability network is complete, we can use :func:`prob` to evaluate probability calculations over that network.  For example, if we want to know the probability of `X or Y`, we can enter the following:

.. code-block:: js

    prob([or,'X','Y'],mynet)

    // result is:

    0.84




Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`


The main interface to the probability calculator
------------------------------------------------

.. autofunction:: calcvars

.. autofunction:: calcs

.. autofunction:: tickconvert

.. autofunction:: sortfs

.. autofunction:: height

.. autofunction:: Dlist

.. autofunction:: resetcode

.. autofunction:: highlight


The calculator formula interpreter
----------------------------------

.. autofunction:: pcalc

.. autofunction:: tokenise

.. autofunction:: pcalctok

.. autofunction:: definition

.. autofunction:: vardef

.. autofunction:: probf



