# Spam Example

After buying a new spam filter that claims 95% accuracy, you test it on 100 of your emails.  The results are:
 
 | | Filter Says “OK” | Filter says “Spam” |
 | --- | --- | --- |
Real Mail | 73 real emails correctly labeled “OK” | 7 real emails incorrectly labeled “Spam” |
Junk Mail (Spam) | 2 junk emails incorrectly labeled “OK” | 18 junk emails correctly labeled “Spam” |

So: _How much should you trust your Spam filter?_

Because of the way we have collected the data, where we have counts in each cell, we can answer this directly without doing Bayesian inference. But let's walk through, because often the most important step is how to interpret the problem.

## Influence Diagram
An email is either spam or not.  The detector either says Spam or not. So the diagram is:

     [Mail Type] --> [Filter Label]

This is yet another "simple diagnostic" problem like Mammogram. But where Mammogram gives us the causal probabilities (like test results given cancer, or label given mail) and asks us to invert them, _this_ problem has given us the full frequency table to slice as we like.

So, _how should we slice it?_

## Clarification

In parallel with Mammogram, I shall read the question about trusting your spam filter as some combination of two diagnostic questions (where causal probabilities follow the arcs, and diagnostic probabilities reverse them):

a. Given a "Spam" label, what is the chance it really is spam?  --_or_--

  b. Given an "OK" label, what is the chance it really is OK?

## Probabilities
Notice the table gives counts for all four _combinations_, like "real mail labeled spam" and "real mail labeled OK". We can use this to answer the question directly (see Discussion), but we can also use it to test out the Calculator.

## Using the Calculator.

The calculator cannot use clever conventions like Spam given "Spam": all variables are True/False. So we will define them as Spam and SaySpam.
<br>
<form id="form1">
  <textarea id="editor1" name="editor1" cols=80>
    <h2>Specify the probabilities</h2>
    <ul>
	<li>\`chance of Spam = 20/100\`</li>
	<li>\`chance of SaySpam given Spam = 18/20\`</li>
	<li>\`chance of SaySpam given not Spam = 7/80\`</li>
	</ul>
	<h2>Answer the Questions</h2>
	<ul>
	<li>Chance of Spam given SaySpam: \`%chance of Spam given SaySpam?\`</li>
	<li>Chance of not Spam given not SaySpam: \`%chance of not Spam given not SaySpam?\`</li>
	</ul>
  </textarea>
  <input id="CalcButton" type="button" value="Calculate" />
  <script>activate_ckeditor("editor1","CalcButton");</script>
</form>
<br>


## Discussion
We can verify these directly because we have the full joint probability table.

a. Given a "Spam" label, the _chance_ that it is spam is #(Spam & "Spam") / #"Spam", or in this case, 18/(7+18) = 18/25, or about 72%.</li>

b. Similarly, chance it is OK given that it is labeled so is  #(OK & "OK") / #"OK", or 73/75, or about 97%.

