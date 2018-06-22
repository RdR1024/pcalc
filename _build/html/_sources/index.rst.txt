.. pcalc documentation master file, created by
   sphinx-quickstart on Fri Jun 22 15:19:03 2018.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Welcome to pcalc's documentation!
=================================

.. toctree::
   :maxdepth: 2
   :caption: Contents:



Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`


## the probability calculator

.. autofunction:: calcvars

The `calcvars` function is the main interface into the calculator.  It expects a text string and will process any formulas in that text string that are contained inside backticks.  The function returns a text string, but now with the formulas marked up inside `<code>...</code>` html tags.  The format for the markup is as follows: