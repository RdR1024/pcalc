# Combinations of probabilities

Somebody says, "There is an even chance that it will rain on Saturday. Same for Sunday". What is the chance of rain on the weekend? The calculator can figure this out for you. 

Firstly, the phrase "even chance" means 50%.  So, the chance of rain on Saturday is 50%. Since Sunday is the same, the chance of rain on Sunday is also 50%.  So, the information that we're given has two probabilities.  Let's define those:

* \`probability of RainSaturday is 50%\`
* \`probability of RainSunday is 50%\`

Once we've defined the given information as probability statements, we can turn to the question.  The chance of rain on the weekend means rain on Saturday, _or_ rain on Sunday (or both). We can write that simply as:

* Rain on the weekend: \`probability of RainSaturday or RainSunday\`

In the calculator, "or" means one or the other (or both).  We can even define a variable RainWeekend:

* \`probability of RainWeekend given RainSaturday or RainSunday is 1\`  (Note: the "is 1" means that "RainWeekend" is completely determined by RainSaturday or RainSunday).
* And then use that new variable in our calculations: \`probability of RainWeekend\`

What about if we want to know the chance of rain on either day, but not both?  We would write:

* Rain on one day of the weekend: \`probability of (RainSaturday or RainSunday) and not (RainSaturday and RainSunday)\`

The use of parentheses in the probability statement is the same as in arithmetic: it ensures that certain combinations of variables are calculated first. 

---

_Shortcuts_

Writing out the full probability statements may become tiresome (although it does add clarity).  Should you wish to, you may want to use abbreviations.  The following are identical:

* probability of X is 50%
* chance of X is 50%
* prob X is 50%
* pr X is 50%
* pr(X) is 50%
* pr X=50%
* pr X=0.5

And these are equivalent as well

* probability of (X or Y) and not (X and Y)
* prob (X | Y) and no (X & Y)
* pr (X | Y) & -(X & Y)

---


### Exercises (2)

1. In the example above, what is the chance of rain on both days of the weekend?
2. What is the probability of rain only on Saturday?

<form id="form1">
  <textarea id="editor1" name="editor1" cols=80>
    <p>Type your formulas below (don't forget the backticks)</p>
  </textarea>
  <input id="CalcButton" type="button" value="Calculate"/>
  <script>activate_ckeditor("editor1","CalcButton");</script>
</form>

