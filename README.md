# pcalc

A simple probability calculator for use with web-based text editors.

pcalc is intended as a library for developers to add to the webpages that have "editor areas" where users may wish to have a calculator handy, especially to do probability calculations.  The calculator can handle Bayesnet type calculations over boolean variables. Visit the user guide for a comprehensive explanation with examples.

## Background

Many kinds of analyses require dealing with uncertainty. Think of risk analysis, intelligence analysis, project estimates, business plans, etc.  A dominant method for handling uncertainty is probability calculations.  However, the tools for doing probability calculations are cumbersome and rarely integrated into the main mode of analysis -- that is, writing documents like reports.

For our project (see the About page in the user guide), we wanted a simple calculator that we could use within the text editor on the project website. The user guide is a "live" online document that shows how the calculator can be used in practice.

## Installation

`npm install pcalc`

## Usage

    var pcalc = require('pcalc');

    pcalc.calcvars("<h1>Pcalc Example</h1><p>Some formulas: `prob X=0.5` `prob Y=0.5`</p><p>Result `prob X or Y?`</p>");

A more realistic example of usage is shown in `pcalcio.js`, where we link the calculator to CKEDITOR.  To see the calculator in action, got to the `/examples` folder and open the wetgrass.html file.  Also visit `richardderozario/pcalc` to see the user documentation.


## Documentation

The user guide is available on [RicharddeRozario/pcalc](https://Richardderozario/pcalc) which links to the `/docs` folder in the repo.  The source for the user guide is in the `/contents` folder.  The user guide is created with [MkDocs](https://www.mkdocs.org/user-guide/writing-your-docs/), so if you clone the repo, you may wish to install MkDocs as well.

The code documentation is available in the `/documentation` folder, and is created using [Sphinx-js](https://github.com/erikrose/sphinx-js).

## Testing

Pcalc uses [Jest](https://facebook.github.io/jest/) for unit testing, so you may wish to install that as well if you clone the pcalc repo.   Just run the tests in the usual way (e.g. `npm test`).

Some examples from the user guide are also in `/examples` folder for easier testing.  The examples are written in markdown text files and converted to html with a bash script.  For example, to convert the `wetgrass.md` example into html, try `./makeh examples/wetgrass.md`


## Acknowledgements

Contributors: [Richard de Rozario](http://richardderozario.org), [Charles Twardy](http://sarbayes.org/author/ctwardy/), [Tim van Gelder](https://timvangelder.com/)

With thanks for feedback from the [SWARM Project](https://www.swarmproject.info/) team.

This research is based upon work supported in part by the Office of the Director of National Intelligence (ODNI), Intelligence Advanced Research projects Activity (IARPA). The views and conclusions contained herein are those of the authors and should not be interpreted as necessarily representing the official policies, either expressed or implied, of ODNI, IARPA, the U.S. Government, or the University of Melbourne. The U.S. Government is authorized to reproduce and distribute reprints for governmental purposes notwithstanding any copyright annotation therein.