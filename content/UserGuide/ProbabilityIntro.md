# Probability as a percentage

The simplest definition of a probability is as the number of cases that we're interested in, divided by the total possible cases.  For example, if you have one out of 100 raffle tickets (one of which will win the prize), then the number of cases we're interested in is one (our own ticket) and the total number of cases is 100 (the total number of tickets that could win). So, our probability of winning is 1/100. We can also say that our percent chance of winning is 1%. We can either use the term "probability" and "chance" -- for our purposes they mean the same thing.

Let's try defining a probability: In backticks, enter "probability of RaffleWin is 1/100" to reflect the idea that we bought only one of the possible 100 tickets (note the use of capitals).

The probability is: \`probability of RaffleWin is 1/100\` 

**Variables:** The capitalised _RaffleWin_ is the probability _variable_. It represents the case  whose probability we're interested in. That is, the case that we win the raffle.  The calculator only deals with _binary_ variables, meaning a situation that can either be _true_ or _false_ (but not both). By convention, we'll name the variables in such a way that they reflect the probability of something being _true_. So, _RaffleWin_ represents the situation where it is _true_ that our ticket wins the raffle.

* Variables _must_ start with an uppercase letter, followed by any number of letters, digits or underscores.
* Variables are case-sensitive: _RaffleWin_ is not the same as _Rafflewin_.

Once you have defined a probability variable, you can use it in other calculations. For example,

* The probability expressed as a percentage: \`round 100 * probability of RaffleWin\`
* Make that prettier by adding a % sign is _outside_ the backticks: \`round 100 * probability of RaffleWin\`%
* The probability of _not_ winning: \`probability of no RaffleWin\`


### Exercises (1)

Use the editor below to calculate the following:

1. Let's say you bought five raffle tickets (out of the possible 100). Use the calculator notation to define the probability of a RaffleWin in this situation.  Then, on the next line, use the calculator notation to check what the probability is.
2. Use the calculator to calculate the probability of _not_ winning the raffle, for the situation where you bought 5 raffle tickets.
3. Let's say that next Saturday is a typical day. Weather records show that 200 out of the last 1000 Saturdays had rain.  Use the calculator to calculate the chance of rain next Saturday.
4. Further to question 3, What is the probability of no rain?
5. Somebody says, "the project is unlikely to fail".  Assuming that "unlikely" means that only 20 out of 100 comparable projects have failed in the past, use the calculator to translate the sentence into a probability calculation.

<form id="form1">
  <textarea id="editor1" name="editor1" cols=80>
    <p>Type your formulas below (don't forget the backticks)</p>
  </textarea>
   <input id="CalcButton" type="button" value="Calculate"/>
  <script>activate_ckeditor("editor1","CalcButton");</script>
</form>
