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

The function :func:`pcalc` is essentially the start of a recursive descent interpreter that translates the formulas into a more easily computable structure, which is passed to the third major sub-module, which is the computational engine for probability networks (more on that later).





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

