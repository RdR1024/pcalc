// pcalc.js -- pcalc module v1
/********** print for debugging can be commented out *
var P = require("./print.js");
var print = P.print;
var concat = P.concat;
/***************************************************************/

var Dlist={};   // global variable dependency list
//var US={"id":"us",nonp:{}};   // expose for debugging

/*********************************************************************
// calculate and update results. The Content parameter expects
// any text with formulas in backticks.  However, it returns
// html text. The following example strings could be given to 
// calcvars as Content:
var WG = "`pr Rain=0.2` `pr Sprinkler:Rain=0.01` `pr Sprinkler:-Rain=0.4` `pr Wet:-Sprinkler,-Rain=0` `pr Wet:-Sprinkler,Rain=0.8` `pr Wet:Sprinkler,-Rain=0.9` `pr Wet:Sprinkler,Rain=0.99` `%pr Wet?` ";
var Simple = "<p>`probability of Y given X is 50%`</p><p>`probability of X is 50%`</p><p>So, the `%probability of Y?`</p>";
var Kernel = "`pr S=1%` `pr V1=5%` `pr V2=5%` `pr V3=5%` `pr W1p=1%` `pr W2p=1%` `pr W3p=1%` `pr W1:W1p=100%` `pr W1:S=90%` `pr W2:W2p=100%` `pr W2:S=90%` `pr W3:W3p=100%`  `pr W3:S=90%` `pr W1:V1 & -S=40%` `pr W2:V2 & -S=40%` `pr W3:V3 & -S=40%` `%pr W1?` `%pr W2?` `%pr W3?` `%pr W3: W1,V1,W2,V2?` `%pr S:W1,V1,W2,V2,W3,V3?`"; 
var Loop = "`pr X:Y=0.5` `pr Y:X=0.5` `pr Y?`";
var Unbalanced = "`pr X=0.5";
var Black = "`pr Plane=10%` `pr Drone=5%` `pr Intercept:Plane=85%` `pr Intercept: -Plane=10%` `pr Report: Drone=95%` `pr Report: -Drone=5%` `pr RusExpert: Plane=80%` `pr RusExpert: -Plane=40%` `pr USExpert: Drone=70%` `pr USExpert: -Drone=20%` `pr Radar:Drone=95%` `pr Radar: Plane=90%` `pr Radar: -(Plane or Drone) =0.5%` `%pr Plane: (Intercept & Report & Radar &  -RusExpert & -USExpert)`";
/********************************************************************/

function calcvars( Content){
    // convert and sort formulas
    Content = tickconvert(Content);
    var Rlist={};
    var Userspace = {"id":"Userspace",nonp:{}};
    //var Userspace=US;

    try{
        var Fs = sortfs(Content.formulas);
        Rlist = calcs(Fs,Userspace);
    } catch(e){ 
        var f = Object.keys(Content.formulas)[0];
        Rlist[f] = {result:e};
    }

    // substitute results
    Content.html = Content.html.replace(/<"([^"]*)">/gi, function(_,x){
        var res = " ";  // space, because other utils might remove empty spans
        if(x in Rlist){
            res += Rlist[x].result;
            if(Content.formulas[x]["F"][0] == "%"){ res+="%"; }
        }
        return res;
    });


    // for "explanation", could add appendix of tables of (conditional) probabilities

    return Content.html;
}

// calculate all formulas in sorted formula list: [[h,fid,formula]...]
// return result list: {'f0':res0, 'f1':res1,...}
function calcs(fs, Net){

    var Res={};
    var fsrest = [];

    // process probability assignment formulas first
    for(var i=0; i<fs.length; ++i){
        if(fs[i][2].search(/=|\s+is\s+/)!=-1){
            try{
                pcalc(fs[i][2],Net);
            } catch(e) { 
                if(type(Res[fs[i][1]])=="Undefined"){ Res[fs[i][1]]={result:null}; }
                Res[fs[i][1]].result = e;
            }
        } else {
            fsrest.push(fs[i]);
        }
    }

    // now ensure the probability network is complete
    completor(Net);

    // now process the remaining probability calculations
    for(i=0; i<fsrest.length; ++i){
        try{
            if(type(Res[fsrest[i][1]])=="Undefined"){ Res[fsrest[i][1]]={result:null}; }
            Res[fsrest[i][1]].result = pcalc(fsrest[i][2],Net);
        } catch(e) { 
            if(type(Res[fsrest[i][1]])=="Undefined"){ Res[fsrest[i][1]]={result:null}; }
            Res[fsrest[i][1]].result = e;
        }
    }

    return Res;
}


// Sort formulas in order of least dependency chain of variables
// Given an object 
//    Fs={ 'f1':{'F':'prob X=0.5'}, 'f2':{'F': 'prob Y=0.5'}...}
// return [[height,fid,F]...]
function sortfs(Fs){
//  var Dlist={};     // variable dependency list, usually declared globally
    Dlist={};
    var DHlist={};    // variable dependency height list
    var fvars=[];     // temporary variable list
    var result=[];    // sort result
    var tempset= new Set();   // temporary Set
    var doesAssign= false;    // temp: does formula assign to a variable?
    // var hasGiven= false;      // temp: does formula have a conditional probability?
    var d=null;               // temp variable
    var f=0;                  // index var

    // build up the variable dependency table
    for(var fid in Fs){
        fvars = Fs[fid].F.match(/([A-Z]\w*)/g) || [];
        Fs[fid]["vars"] = fvars;
    
        // initialise dependency height for assignments and simple calcs
        // simple calcs should always come after assignments, so init height=1000
        doesAssign = Fs[fid].F.match(/(?:=|\s+is\s+)/);
        Fs[fid]["height"] = doesAssign ? 0 : 1000 ;
    
        // update variable dependency table
        // the reason for using sets here is to avoid duplicate variables
        // in the dependency list
        if(doesAssign && fvars != []){
            if(fvars[0] in Dlist){  // there was already an entry for this var
                tempset = new Set(fvars.slice(1));
                Dlist[fvars[0]] = new Set([...Dlist[fvars[0]],...tempset]);
            } else {  // a new entry for this var
                Dlist[fvars[0]] = new Set( fvars.slice(1) );
            }
        }

        // calculate "height" of each dependent variable in each formula
        d=null;
        for(d in Dlist){ 
            try{ DHlist[d] = height(d,Dlist, new Set); } catch(e){ throw "error: variable dependency issue"; }

        }
        // calculate "height" of each formula as max height of all vars in
        // the formula.
        for(f in Fs){
            for( var k in Fs[f].vars){
                d= Fs[f].vars[k];
                if(typeof(DHlist[d]) != "undefined" && DHlist[d] > Fs[f].height){
                    Fs[f].height = DHlist[d];
                }
            }
        }
    }
  
    // put all the information together into a formula list sorted by height
    for(f in Fs){ 
        result.push([Fs[f].height,f,Fs[f].F]); 
    }
  
    result = result.sort(function(a,b){return a[0]-b[0];});
    return result;

}

// node height in a directed acyclic graph
function height(node,D,curpath){
    if(!(node in D) || D[node]==[]) return 0;
    // if(curpath.has(node)) throw "error (dependency loop) for "+node;

    curpath.add(node);
    var maxheight = 0;
    for(var n of D[node]){
        maxheight = Math.max(maxheight,height(n,D,curpath)) + 1;
    }
    return maxheight;
}


// The varconvert function.  Input is a document text string.
// Output is html text and formula list. Enables the user to enter 
// a formula using backticks, rather than insert more cumbersome <code> tags
// We're deliberately not using DOM traversal, because backticks don't
// necessarily follow the DOM hierarchy, and to avoid XSS risk
function tickconvert(s){
    Dlist={};             // reset the global variable dependency list
    var Fs={};            // init formula list
    var result="";
    var invar=false;      // are we inside <code></code> tags?
    var k=s.length;       // position in s of last </code> tag
    var formula="";       // any formula text extracted from s
    var nticks=0;         // number of ticks
    var fid=0;            // formula id
    var amp= /&amp;/g;    // html special character for ampersand
    var nbsp = /&nbsp;/g; // html special character for hardspace
    var hardspace = new RegExp(String.fromCharCode(160), "g");
    var ftype = "-A";

    for(var i=s.length - 1; i>=0; --i){
        if(s[i]=="`" && (i==0 || (s[i-1]) !="\\")){ //Note: backticks can be escaped as usual
            ++nticks;
            if(invar){
                formula = s.substring(i+1,k).replace(hardspace," ").replace(nbsp," ").replace(amp,"&");
                ftype = formula.search(/=|\s+is\s+/)==-1 ?  (formula.search(/\?/)==-1? "B" : "C") : "A";
                Fs["f"+fid] = {"F":formula};
                result = "<code class=\"pcalc"+ftype+"\">" 
               + "<span class=\"formula"+ftype+"\" id=\"f"+fid+"\">" 
               + result;
                invar = false;
                ++fid;
            } else {
                result = "</span>"
               + "<span class=\"result\" id=\"r"+fid+"\"><\"f"+fid+"\"></span>" 
               + "</code>" 
               + result;
                k = i;
                invar = true;
            }
        } else {
            result = s[i] + result;
            if(s[i]=="`" && i>0 && s[i-1]=="\\"){
                --i;         // skip the backslash that escapes the backtick
            }
        }
    }

    // append type to result class based on ftype
    const formu = /<span\s+class="formula(.)"\s+id="([^"]*)"\s*>([^<]*)<\/span>\s*<span\s+class="result"/gi;
    result = result.replace(formu,function(_,ftype,fid,f){
        return "<span class=\"formula"+ftype+"\" id=\""+fid+"\">"+f+"</span><span class=\"result"+ftype+"\"";
    });

    // check if formula ticks are balanced
    if( (nticks % 2) == 0){ 
        return {"html":result, formulas:Fs }; 
    } else { 
        return {"html":s.replace(/<\/body>/,"<b>unbalanced formula tick marks</b></body>"), formulas:null }; 
    }
}


function resetcode(s){
    Dlist = null;       // reset global variable dependency list
    const startcode = /<code\s+class\s*=\s*"pcalc.">\s*<span\s+class="formula."\s+id="[^"]*"[^>]*>/gi;
    const endcode = /<\/span>\s*<span\s+class="result."\s+id="[^"]*"[^>]*>[^<]*<\/span>\s*<\/code>/gi;

    // also check for explanation in the appendix

    return s.replace(startcode,"`").replace(endcode,"`");
}

// helper function for highlighting results, if the editor/webpage itself doesn't take care of that
function highlight(s){
    const code = /<code\s+class\s*=\s*"pcalcB">\s*<span\s+class="formulaB"\s+id="([^"]*)"\s*>([^<]*)<\/span>\s*<span\s+class="resultB"\s+id="([^"]*)"\s*>([^<]*)<\/span>\s*<\/code>/gi;
    return s.replace(code,function(_,fid,f,rid,res){
        return "<code class=\"pcalcB\"><span class=\"formulaB\" id=\""+fid+"\" style=\"display:none\">"+f+"</span><span class=\"resultB\" id=\""+rid+"\" style=\"background-color:yellow\">"+res+"</span></code>";
    });
}


// pcalc FORMULA INTERPRETER MODULE SOURCE -- INCLUDED FOR PACKAGING

// top level interface to the interpreter
function pcalc(S,U={"id":null,nonp:{}}){ 
    // console.log(U);
    return pcalctok(tokenise(S),U);  
}

// remove whitespace, separate tokens, numbers and symbols
// precalculate numbers.  Note: question mark is counted as space
function tokenise(s){
    var result=[];
    var space, token, number, exponent, symbol;
    while(s != ""){
        space = s.match(/^[ ?\t\n]+/);
        if(space){ s = s.substring(space[0].length); }
        token = s.match(/^[A-Z_][A-Z0-9_]*/i);
        if(token){
            result.push(token[0]);
            s = s.substring(token[0].length);
        }
        number = s.match(/^-?(?:\.[0-9]+|[0-9]+(?:\.[0-9]+)?)/);
        if(number){
            s = s.substring(number[0].length);
            exponent = s.match(/^e-?(?:\.[0-9]+|[0-9]+(?:\.[0-9]+)?)/);
            if(exponent){
                s = s.substring(exponent[0].length);
                result.push(Math.pow(number[0],exponent[0].substring(1)));
            } else { result.push(parseFloat(number[0])); }
        }
        symbol = s.match(/^[^A-Z0-9_ ?\t\n]/i);
        if(symbol){
            result.push(s[0]);
            s=s.substring(1);
        }
    }
    return result;
}

function pcalctok(s,U){
    var res=null;

    res = definition(s,U);
    if(!res.err){ return res.val; }

    res = expression(s,null,U);
    if(res.err==-1){ return res.val; }
    else{ return res.err;}
}

function definition(s,U){
    var res=null;

    res = probf(s);
    if(!res.err){
        s=res.tail;

        res = pdef_simple(s,U);
        if(!res.err){ return res; }

        res = pdef_given(s,U);

        return res;
    }

    res = vardef(s,U);

    return res;
}

// probability definition grammar:
// pdef -> "(" pdef ")" | pdef_simple | pdef_given


function vardef(s,U){
    var res=null;
    var varname, value;

    res = vname(s);
    if(!res.err){ varname=res.val; s=res.tail; } else{ return res; } 

    res = token(s,["=","is"]);
    if(!res.err){ s=res.tail; } else{ return res; }

    res = expression(s,null,U);
    if(!res.err || res.err==-1){ value=res.val; s=res.tail;} else{ return res; }

    U.nonp[varname] = value;
    return {err: false, val: value, tail: s};
}



function probf(s){
    if(s.length >= 2 && (s[0]=="probability" || s[0]=="chance") && s[1]=="of"){
        return {err: false, val: true, tail: s.slice(2)};
    }

    if(s.length >0 && (s[0]=="chance" || s[0]=="probability" || s[0]=="prob" || s[0]=="pr") ){
        return {err: false, val: true, tail: s.slice(1)};
    }

    return {err:"no probf", val: null, tail: s};
}

function pdef_simple(s,U){
    //    console\.log("** simple probability definition. s="+s);
    var res=null;
    var varname, value;

    res = pvname(s);
    if(!res.err){ varname=res.val; s=res.tail; } else{ return res; } 
    //    console.log("*** pdef_simple. varname="+varname);

    res = token(s,["=","is"]);
    if(!res.err){ s=res.tail; } else{ return res; }

    res = expression(s,null,U);
    //    console.log("** back in pdef_simple. value="+res.val);
    if(!res.err || res.err==-1){ value=res.val; s=res.tail;} else{ return res; }

    // create variable in probability network (U) if it doesn't exist already
    // the structure for unconditional probability variables is
    // e.g.     "R" :   { true: 0.20 }
    if(typeof(U[varname])=="undefined"){
        U[varname] = { true: null };
    }
    U[varname].true = value;
    return {err: false, val: U[varname].true, tail: s};
}


function pdef_given(s,U){
    //    console.log("** conditional probability definition. s="+s);
    var res=null;
    var varname, pexpr, value;

    res=pargiven(s);
    if(!res.err){
        varname=res.varname;
        pexpr=res.val;
        //        console.log("*** back in pdef_given from pgiven. varname="+varname+" pexpr="+pexpr);
        res={err:false, val:pexpr, tail:res.tail};
        s=res.tail;
    } else {return res;}

    res = token(s,["=","is"]);
    if(!res.err){ s=res.tail; } else{ return res; }

    //    console.log("** onto numeric expression");
    res = expression(s,null,U);
    //    console.log("** back in pdef_given. value="+res.val);
    if(!res.err || res.err==-1){ value=res.val; s=res.tail;} else{ return res; }

    // if the probability variable doesn't exist in the network (U), then create
    // and entry.  The format for conditional probability variables is
    // e.g. "S" :   { [formulas]:   [   [0.01, logic_expression], [0.4, [not, logic_expression]]] }
    // Formulas are a disjunctive list of conditional probabilities, where the first value is
    // the conditional probability and the remainder of the list is the condition as a logic expression
    if(typeof(U[varname])=="undefined"){
    // console.log("creating "+varname);
        U[varname] = {[formulas]: []};
    }
    // console.log("U["+varname+"][formulas].push(["+value+","+pexpr+"])");  
    U[varname][formulas].push([value,pexpr]);
    return {err: false, val: U[varname][formulas][U[varname][formulas].length-1][0], tail: s};
}


// the probability given part can be wrapped in parentheses, like pr(X:Y)=0.5
// grammar for that: pargiven -> "(" pargiven ")" | pgiven
function pargiven(s){
    var value, varname;
    var res=token(s,["("]);
    if(!res.err){
    //        console.log("*** in pargiven parenthesis. res.tail="+res.tail);
        res=pargiven(res.tail);
        //        console.log("*** returned from pargiven. res.tail="+res.tail+" res.varname="+res.varname);
        if(!res.err){
            value=res.val;
            varname=res.varname;
            //            console.log("*** returned from pargiven. res.tail="+res.tail+" res.varname="+varname);
            res=token(res.tail,[")"]);
            if(!res.err){
                res.val=value;
                res.varname=varname;
            }
            return res;
        }
    }

    res=pgiven(s);
    return res;
}

function pgiven(s){
    var res={};
    var varname;

    res = vname(s);
    if(!res.err){ varname=res.val; s=res.tail; } else{ return res; } 

    res = token(s,[":","given"]);
    if(!res.err){
        res = pexp(res.tail,"");
        if(!res.err || res.err==-1){ res.varname=varname; }
    }

    return res;
}

// probability definitions can wrap vname in parentheses, like pr(X)=0.5
// so we'll create a grammar for that:  pvname -> "(" pvname ")" | vname
function pvname(s){
    var value;
    var res=token(s,["("]);
    if(!res.err){
        res=pvname(res.tail);
        if(!res.err){
            value=res.val;
            res=token(res.tail,[")"]);
            if(!res.err){res.val=value;}
            return res;
        }
    }

    res=vname(s);
    return res;
}

function vname(s){
    //    console.log("** vname");
    if(s.length>0 && typeof(s[0])=="string" && s[0][0]>="A" && s[0][0]<="Z"){
        return {err: false, val: s[0], tail:s.slice(1)};
    } else{
        return {err:"no vname", val:null, tail:s};
    }
}

/*
The grammar for arithmetic expressions is as follows:
expression -> term asop | asop
term -> factor emdop
factor -> "(" expression ")" | FUNC
asop -> "+" term asop | "-" term asop | EMPTY
emdop -> "^" factor emdop | "*" factor emdop | "/" factor emdop | EMPTY

Note: FUNC is a number or a function of a number
*/

function expression(s,V,U){
    // console.log("** expression. V="+V);
    var res=term(s,V,U);
    if(!res.err || res.err==-1){
        // console.log("** back in expression from term. res.val="+res.val);
        res=asop(res.tail,res.val,U);
        if(!res.err || res.err==-1){
            return {err:res.err, val:res.val, tail:res.tail};
        }
    }

    // console.log("** expression didn't start with term.");
    if(V==null){V=0;}
    res=asop(s,V+0,U);
    if(!res.err || res.err==-1){
        return {err:res.err, val:res.val, tail:res.tail};
    }

    // since asop can be EMPTY, it will always succeed here
}

function term(s,V,U){
    // console.log("** term. V="+V);
    var res=factor(s,V,U);
    if(!res.err){
    //        console.log("** back in term from factor ok. res.val="+res.val);
        res=emdop(res.tail,res.val,U);
        if(!res.err || res.err==-1){
            return {err:res.err, val:res.val, tail:res.tail};
        }
    }
    //
    //    console.log("** back in term, but err from factor or emdop= "+res.err);
    //    if(res.err==-1){ console.log("** term stopped on factor. value="+res.val)};
    return res;
}

function factor(s,value,U){
    // console.log("** factor. V="+value);

    // factor is either a parenthesised expression
    var res=token(s,["("]);
    if(!res.err){
    //        console.log("** inside parenth expression. res.tail="+res.tail);
        res=expression(res.tail,value,U);
        //        console.log("** back inside parenth expression. res.val="+res.val+" res.err="+res.err);
        if(!res.err || res.err==-1){
            value=res.val;
            //            console.log("** back inside parenth expression. exp value="+value);
            res=token(res.tail,[")"]);
            if(!res.err || res.err==-1){
                //              console.log("** completed parenth expression");
                return {err:false, val:value, tail:res.tail};
            } else {
                //              console.log("** no closing parenth. returning with error");
                return {err:"Expected ), got "+res.tail, val:res.val, tail:res.tail};
            }
        }
    }

    // ...or a number or function
    res=func(s,U);
    if(!res.err){
    //        console.log("** factor is a number. val="+res.val);
        return {err:false, val:res.val, tail:res.tail};
    }

    // otherwise terminate
    //    console.log("** neither parenth nor func")
    return {err:res.err, val:value, tail:s};
}

function asop(s,startval,U){
    //    console.log("** asop. V="+startval);
    if(s.length <=0) { return {err:-1, val:startval, tail:[]};}
    var res, value;

    res=token(s,"+");
    if(!res.err){
    //        console.log("** in asop. it's addition. tail="+res.tail);
        res=term(res.tail,startval,U);
        if(!res.err || res.err==-1){
            value=startval+res.val;
            //            console.log("** addition result="+value);
            return asop(res.tail,value,U);
        } else {
            return {err:"no term",val:startval,tail:s};
        }
    }

    //    console.log("maybe substraction? s[0]="+s[0]);
    res=number(s);
    if(!res.err && res.val<=0){
    //        console.log("** special minus condition. s[0]="+s[0]);
        s[0] = 0-s[0]; s.unshift("-");
    }
    res=token(s,"-");
    if(!res.err){
    //        console.log("** in asop. it's subtraction. tail="+res.tail);
        res=term(res.tail,startval,U);
        if(!res.err || res.err==-1){
            value=startval-res.val;
            //            console.log("** subtraction result="+value);
            return asop(res.tail,value,U);
        }
    }

    // otherwise empty
    //    console.log("** not + or - so empty");
    return {err:false, val:startval, tail:s};
}


function emdop(s,value,U){
    //    console.log("** emdop. V="+value);
    if(s.length <=0) { return {err:-1, val:value, tail:[]}; }
    var res;

    //    console.log("** emdop, about to check for operators.");
    res=token(s,["^"]);
    if(!res.err){
    //      console.log("** it's exponentiation");
        res=factor(res.tail,value,U);
        if(!res.err || res.err==-1){
            //        console.log("** returned from factor. expon result="+Math.pow(value,res.val));
            value=Math.pow(value,res.val);
            res=emdop(res.tail,value,U);
            if(!res.err || res.err==-1){
                return {err:false, val:res.val, tail:res.tail};
            }
        } else {
            return {err:"no term",val:value,tail:s};
        }
    }

    res=token(s,["*"]);
    if(!res.err){
    //      console.log("** it's multiplication");
        res=factor(res.tail,value,U);
        if(!res.err || res.err==-1){
            //        console.log("** returned from factor. mult result="+value*res.val);
            value=value*res.val;
            res=emdop(res.tail,value,U);
            if(!res.err || res.err==-1){
                return {err:false, val:res.val, tail:res.tail};
            }
        } else {
            return {err:"no term",val:null,tail:s};
        }
    }

    res=token(s,["/"]);
    if(!res.err){
    //      console.log("** it's division");
        res=factor(res.tail,value,U);
        if(!res.err || res.err==-1){
            //        console.log("** returned from factor. div result="+value/res.val);
            value=value/res.val;
            res=emdop(res.tail,value,U);
            if(!res.err || res.err==-1){
                return {err:false, val:res.val, tail:res.tail};
            }
        } else {
            return {err:"no term",val:null,tail:s};
        }
    }

    // otherwise error (but that could indicate the end of the expression)
    //    console.log("** no emd op, so return empty");
    return {err:false, val:value, tail:s};
}


function token(s,toks){
    if(s.length>0 && toks.indexOf(s[0]) > -1){
        return {err:false, val:s[0], tail: s.slice(1)};
    } else {
        return {err:"no tok",val:null,tail:s};
    }
}

function func(s,U){
    // console.log("** function or number");
    //var value;

    var res = token(s,["round", "rounded"]);
    if(!res.err){
        res= expression(res.tail,null,U);
        if(!res.err || res.err==-1){
            return {err:false, val:Math.round(res.val), tail:res.tail};
        }
    }

    res = token(s,["percent", "%"]);
    if(!res.err){
        res= expression(res.tail,null,U);
        if(!res.err || res.err==-1){
            return {err:false, val:Math.round(100*res.val), tail:res.tail};
        }
    }

    //    console.log("** got to number s="+s);
    res = number(s);
    if(!res.err) {return res;}

    res = probf(s,U);
    if(!res.err){
        res = pexpression(res.tail,U);
        if(!res.err) {return res;}
    }

    res=vname(s);
    if(!res.err && res.val in U.nonp){
        res.val = U.nonp[res.val];
        //        console.log("** found variable: "+res.val+" tail="+res.tail);
        return res;
    }

    return {err:"no number or function",val:null,tail:s};
}

function number(s){
    if(s.length>0 && typeof(s[0])=="number"){
    //        console.log("** number ="+s[0]);
        var res=token(s.slice(1),["%"]);
        if(!res.err){
            //            console.log("** found percent");
            return {err: false, val:s[0]/100, tail:res.tail};
        } else {
            return {err: false, val:s[0], tail: s.slice(1)};
        }
    } else { return {err:"no number",val:null,tail:s}; }
}

/*
The grammar of probability logic is:
pexpression -> pexp | vpargiven      // evaluation only happens here
pexp -> pterm poperation
pterm -> "-" pterm | plogic
plogic -> "(" pterm ")" | vname
poperation -> "&" pexp | "|" pexp | EMPTY
vpargiven -> "(" vpargiven ")" | vgiven
vgiven -> pexp (":" | "given") pexp

Note: the probability logic constructs a logic expression, which is evaluated
at the end.  Otherwise, we'd be passing big BitArrays around.
*/

function pexpression(s,U){
    // console.log("*** pexpression. s= "+s);
    var X=null;
    if(s.length <=0) { return {err:-1, val:null, tail:[]}; }

    // a conditional probability value
    var res=vpargiven(s,null,U);
    if(!res.err || res.err==-1){
    //        console.log("*** return from vgiven. value="+res.val);
        return res;
    }

    // otherwise, a probability logic expression
    res=pexp(s,"");
    if(!res.err || res.err==-1){
        // console.log("*** returned from pexp. res.val="+res.val);
        //X = type(res.val) != "Array" ? [res.val] : res.val;
        X = res.val;
        return {err:false, val:prob(X,U), tail:res.tail};
    }

    // or neither
    //    console.log('*** neither vgiven nor pexp');
    return res;
}

// vpargiven is vgiven wrapped in optional parentheses
function vpargiven(s,value,U){
    // console.log("*** vpargiven");
  
    // either we have opening parenthesis
    var res = token(s,["("]);
    if(!res.err){
        res = vpargiven(res.tail,value,U);
        if(!res.err){ 
            value = res.val;
            res=token(res.tail,[")"]);
            if(!res.err){ 
                res.val=value;
                //console.log("*** found closing parenth. res.value="+res.val);
                return res;
            }
        }
    }
  
    // ... or vgiven
    //console.log("*** no parenth, so try vgiven. s="+s);
    res=vgiven(s,value,U);
    //console.log("*** got vgiven. res.value="+res.val);
    return res;
}

function vgiven(s,value,U){
    // console.log("*** vgiven. s="+s);
    var pexpval=null;
    // var pval=0.0;

    //logic variable
    // console.log("**** try pexp");
    var res = pexp(s);
    if(!res.err){
        pexpval=res.val;

        // console.log("**** got pexp="+pexpval);
        res=token(res.tail,[":","given"]);
        if(!res.err){
            // console.log("**** got given token");
            res=pexp(res.tail,"");
            if(!res.err || res.err==-1){
                // console.log("**** got given expr. will evaluate [given,"+pexpval+","+res.val+"]");

                value= prob([given,pexpval,res.val],U);
                //        console.log("******    expr="+value);
                return {err:res.err, val:value, tail:res.tail};
            } else {
                return {err:"no expression",val:value,tail:s};
            }
        }
    }

    // otherwise not vgiven
    return res;
}

function pexp(s,value){
    // console.log("*** pexp. s= "+s);

    var res=pterm(s,value);
    if(!res.err || res.err==-1){
        value = res.val;
        res=poperation(res.tail,value);
    }

    return res;
}

function pterm(s,value){
    //    console.log("*** pterm");
    if(s.length <=0) { return {err:-1, val:value, tail:[]}; }

    // Negated expression
    var res=token(s,["-","not","no"]);
    if(!res.err){
    //      console.log("*** got negation");
        res=pterm(res.tail);

        if(!res.err){
            return {err:false, val:[not,res.val], tail:res.tail};
        } else {
            return {err:"no logic",val:value,tail:s};
        }

    }
    //...or positive expression
    //    console.log("*** got positive expression");
    res=plogic(s,value);

    // otherwise just return
    return res;
}


function plogic(s,value){
    //    console.log("*** plogic");

    // Parenthesised expression
    var res=token(s,["("]);
    if(!res.err){
    //      console.log("*** it's a parenthesised expression");
        res=pexp(res.tail,value);
        if(!res.err){
            value=res.val;
            res=token(res.tail,[")"]);
            if(!res.err){
                return {err:false, val:value, tail:res.tail};
            } else {
                return {err:"no )",val:value,tail:s};
            }
        }
    }

    //...or a variable
    //    console.log("*** no parentheses, try vname")
    res=vname(s);
    if(!res.err){ return res;  }
    return {err:"no var or expression",val:value,tail:s};
}

function poperation(s,value){
    //    console.log("*** poperation");

    var res=token(s,["&",",","and"]);
    if(!res.err){
    //        console.log("*** it's conjunction. in value="+value);
        res=pexp(res.tail);
        if(!res.err){
            return {err:false, val:[and,value,res.val],tail:res.tail};
        }
    }

    res=token(s,["|","or"]);
    if(!res.err){
    //        console.log("*** it's disjunction");
        res=pexp(res.tail);
        if(!res.err){
            return {err:false, val:[or,value,res.val],tail:res.tail};
        }
    }

    //    console.log("*** empty");
    return {err:false, val:value, tail:s};

}

// DNF MODULE SOURCE included for packaging
// dnf.js -- transform propositional logic into Disjunctive Normal Form and
// calculate probability based on defined probability variables supplied in a
// "Bayesian Network".  The network is interpreted as "noisy OR" -- i.e. 
// parents are presumed independent unless explicitly linked in the ancestor
// network.

const and="and";
const or="or";
const not="not"; 
const given="given";
const divide="divide";
const formulas="#";      // special key for formulas in the probability network
const probs="probs";
const vars="vars";


// complete the conditional probabilities for any incomplete variable,
// using the "noisy-or" negation of the product of negations.
function completor(Net){
    if(type(Net)!="Object"){return false;}

    var Factors = [];
    var Combos=[];
    var C=null;
    var Prob;
    var Vs=Object.keys(Net);
    var X=null;
    const Vardef = /^[A-Z]/;

    // Ensure that Net has its variable list
    Net[vars]=[];
    for(var k=0; k<Vs.length; ++k){ if(Vardef.test(Vs[k])){ Net[vars].push(Vs[k]); }  }
    Net[vars] = Net[vars].sort();
    
    // check that all conditional variables are complete
    for(var v in Net){
        // go through all the variables in Net that have conditional dependency formulas
        if(v!="id" && v!="nonp" && type(Net[v][formulas])!="Undefined"){
            // record all variables that a conditional variable depends on
            Net[v][vars]=getvars(Net[v][formulas]);

            // if the conditions are not complete, then use "noisy-or" to complete them
            if(!orcomplete(v,Net)){    
                // console.log("treating "+v);
                // get the factors (i.e. each of the conditional formulas) of variable v
                Factors =[];
                for(var i=0; i<Net[v][formulas].length; ++i){
                    Factors.push(Net[v][formulas][i]);  // we might want to retain the Ps
                }
                // create all combinations of Factors
                if(Factors.length==1){
                    //console.log("1 factor: "+Factors[0]);
                    Net[v][formulas]=[[0,[not,Factors[0][1]]], Factors[0]];
                } else {
                    Combos=[];
                    for(i=0; i<Math.pow(2,Factors.length); ++i){
                        C=[and];
                        Prob = 0;
                        for(var j=0; j<Factors.length; ++j){
                            if(i & Math.pow(2,j)){
                                X = Factors[j][1];
                                C.push(X);
                                Prob += Math.log(1-Factors[j][0]); 
                            } else {
                                C.push( [not].concat(Factors[j].slice(1)) );
                            }
                        }
                        C = dnf(C); 
                        if(C.length>0){
                            Prob = 1-Math.exp(Prob);
                            Combos.push([Prob,C]);    
                        }
                    }
                    Net[v][formulas]=Combos;    
                }
            }
            Net[v][formulas]=condnf(v,Net);

            Net[v][probs]=[];
            for(j=0; j<Net[v][formulas].length; ++j){
                Net[v][probs].push(Net[v][formulas][j][0]);  // all we need to keep from the unit conjunctions is their probability (sorted) 
            }
        }
    }
    
    return true;
}

// transform conditions of conditional variables to DNF
function condnf(V,Net){
    if(type(Net)!="Object"){return false;}

    var W=null, Y=null, Z=null;
    var Formulas =[];
    var Combos=[];
    var C=[];      // an individual combo

    
    var Vars = []; // notational convenience: the conditional variables of v
    // ensure that all conditional variables are complete
    Combos= Net[V][formulas];
    Vars=getvars(Net[V][formulas]);
    Formulas = new Array(Math.pow(2,Vars.length));

    for(var h=0; h<Math.pow(2,Vars.length); ++h){
        Y = x2v(h,Vars);
        Formulas[h]=[0,Y];
        //console.log("checking var combination "+h+": ["+Y+"]");
        inner: for(var k=0; k<Combos.length; ++k){
            //console.log("...against combo "+k+": ["+Combos[k][1]+"], with dnf:");
            C = dnf(Combos[k][1]);
            //console.log(C);
            if(typet(C)==or || getvars(C).length < Vars.length){
                C = typet(C)==or? C: [or,C];
                for(var m=1; m < C.length; ++m){
                    //console.log("......against combo term "+m+" ["+C[m]+"]");
                    Z= allvars(C[m],Vars);
                    for(var n=0; n<Z.length; ++n){
                        W = v2x(Z[n],Vars);
                        //console.log(".........against expansion of term: ["+Z[n]+"] == "+W);
                        if(h == W){
                            //console.log(".........match. P="+Combos[k][0]);
                            Formulas[h][0]=Combos[k][0];
                            break inner;
                        }    
                    }
                }    
            } else {
                W = vars2x(C,Vars);
                //console.log("...index of combo is "+W);
                if(h == W){
                    //console.log(".........match. P="+Combos[k][0]);
                    Formulas[h][0]=Combos[k][0];
                    break inner;
                }    
            }
        }
    }
    return Formulas;
}


// check if the conditions of a conditional probability are complete
// which is another way of saying that the conditions are too generally specified, not specific enough
// e.g. compare the oil problem, variable 'S', with the specificity of W in wetgrass (wg)
function orcomplete(V,Net){
    if(type(Net)!="Object") throw "Unknown variable network";
    var Fs = lookup(V,Net,formulas);
    if(!Fs) { return true; }  // no formulas is treated as "complete"
    var Vars = getvars(Fs);
    var X=null;
    var B = new BitArray(Math.pow(2,Vars.length));
    var complete=true;
    var F=[];
    orcloop: for(var i=0; i<Fs.length; ++i){
        F= allvars(dnf(Fs[i][1]),Vars);
        //console.log("allvars for factor Fs["+i+"]: ["+Fs[i]+"] are: ");
        //print(F);
        for(var j=0; j<F.length; ++j){
            X = vars2x(F[j],Vars);
            //console.log("...F["+j+"]: ["+F[j]+"] with index: "+X);
            if(!B.getbit(X)){
                //console.log("......first encounter. set bit.");
                B.setbit(X);
            } else {
                //console.log("...... seen before. Fs["+i+"] is too general: incomplete");
                complete=false;
                break orcloop;
            }
        }
    }
    return complete;
}



// transform formula into Disjunctive Normal Form
function dnf(Formula, max=10){
    var X=distand(Formula);
    var Y=null;
    for(var i=0; i<max; ++i){
        Y= distand(X);
        if(!equals(X,Y)){
            X= type(Y)=="Array"? Y.slice(0) : Y;
        } else {
            break;
        }
    }

    if(type(X)=="Array" && Y.length==1 && type(X[0])=="Array"){ X=X[0]; }
    return X;
}

// recursively look for places to distribute "and" over "or" in 
// a list of terms. A term is any of [and,...], [or,...], [not,...], [given,...], [divide,...]
// or a simple variable, e.g. "X". Expects list of formulas, but will handle single formula.
// example: F=[or,[not,[and,'X',[not,'Y']]],'X',[or,'A','B']]
function distand(L,curop=null){
    if(type(L) != "Array" || type(L[0])=="undefined" ){ return L; } // not a list, so return unchanged
    if([and,or].includes(typet(L)) && curop==L[0]){  return distand(L.slice(1),curop); }
    if([and,or,not,given].includes(typet(L))){ return distand([L]); }
    var Res=[], Res1=[];
    var Others=[];
    var X=null, Y=null, Z=null, V=null;
    var h=null, i=null, j=null;
    var dup = false, contra=false;

    // process all terms
    for(i=0; i<L.length; ++i){
        if( ["Variable","String"].includes(typet(L[i])) ){     // primitives, so just append
            Res.push(L[i]);
        } else if(typet(L[i])==not){
            if(typet(L[i][1])!="Variable"){
                X = distnot(L[i],curop);
                if(curop == typet(X)){
                    Res = Res.concat(X.slice(1));
                } else if(typet(X)!="Undefined"){ Res.push(X); }
            } else { Res.push(L[i]); }
        } else if( typet(L[i])==or  ){                               // search further in "or" subterms
            //console.log("or term: ["+L[i]+"]");
            X = distand(L[i].slice(1),or);
            //console.log("   ...after distand of or slice: ["+X+"]");
            // remove duplications
            Res1=[];
            for(h=0; h<X.length; ++h){
                dup = false;
                for(j=0; j<Res1.length; ++j){
                    //console.log("   against "+Res1[j]);
                    if(equals(X[h],Res1[j])){ dup=true; break; }
                    if(equals(X[h],distnot([not,Res1[j]]))){ dup=true; Res1.splice(j,1); break;}
                }
                if(!dup){ Res1.push(X[h]); }
            }
            //console.log("   Res1 after dup removal: ["+Res1+"]");
            if(Res1.length>1){
                if(curop==or){ Res=Res.concat(Res1); } 
                else { Res.push([or].concat(Res1)); }
            } else if(Res1.length==1){Res=Res.concat(Res1); }
            //console.log("Res is now: ");
            //console.log(Res);
        } else if( typet(L[i])==given ){                              // change "given" into "divide" and search
            X = distand([and,L[i][1],L[i][2]]);
            Y = distand(L[i][2]);
            if(curop==and && X.length>0){
                // check that X isn't cancelled by other "and" terms. e.g. F=[and,[not,'X'],[given,'X','Y']]
                Others = L.slice(0,i).concat(L.slice(i+1));
                contra=false;
                for(var k=0;k<Others.length; ++k){
                    Z= distand([and,Others[k],X[0]]);
                    if(Z.length==0){ contra=true; break;}
                }
                if(contra){ Res=[]; break;}
            }
            if(X.length>0){
                Res.push([divide,X[0], typet(Y)=="Variable"? Y: Y[0] ]);
            } else if (X.length==0 && Y.length==0){ 
                Res.push( [divide,[],[]] ); 
            } else if(curop==and){ Res=[]; break; }                 // resolution rule: []/Y => []
        } else if( typet(L[i])==divide){                              // search further in "divide" subterms
            X = distand(L[i][1]);
            Y = distand(L[i][2]);
            if(X.length>0){
                Res.push([divide,X[0], typet(Y)=="Variable"? Y: Y[0] ]);
            } else if (X.length==0 && Y.length==0){ 
                Res.push( [divide,[],[]] ); 
            }
        } else if( typet(L[i])==and){                                  // a possible "and" term to distribute
            Z = orsfirst(L[i].slice(1));  // split subterms into "or" terms and others

            X = distand(Z.rest,and);
            for(j=0;j<X.length;++j){
                // extract ors from rest resulting from distand
                if(typet(X[j])==or){
                    Z.ors.push(X[j]);
                    X.splice(j,1);
                }
            }

            // remove duplications and contradictions in the non-or terms
            //console.log("rest term: ");
            //console.log(X);
            Y=[];
            for(h=0; h<X.length; ++h){
                dup = false;
                contra =false;
                for(j=0; j<Y.length; ++j){
                    if(equals(X[h],Y[j])){ dup=true; break; }
                    if(equals(X[h],distnot([not,Y[j]]))){ contra=true; Y=[]; break;}
                }
                if(contra){ break;}
                if(!dup){ Y.push(X[h]); }
            }

            // try or-distribution, incl. over rest of terms (Y)
            if(Z.ors.length== 0){         // no or-terms, just use the rest
                Res1=Y;
                if(contra && curop==and){Res=[]; break; }
            } else if(Z.ors.length == 1){ // a single or-term. Flip "and" and "or" and search the subterms
                Res1=[];
                for(j=1; j<Z.ors[0].length; ++j){
                    Res1.push( [and, Z.ors[0][j]].concat(Y) );
                }
                //console.log("  Redistributed or term:");
                //console.log(Res1);
                V=distand(Res1,or);
                if(V.length>1){
                    Res1= [[or].concat( V )];
                } else if(V.length==1){ Res1=V; }
                //console.log("  distand over resdistrib or term:");
                //console.log(Res1);
            } else {                        // the main game: multiple or-terms to distribute the and over
                X = combos([and].concat(Z.ors));
                //console.log("Combos: ");
                //console.log(X);
                Res1=[];
                for(j=1; j<X.length; ++j){
                    if(typet(X[j])==and){
                        Res1.push(X[j].concat(Y));
                    } else { Res1.push([and,X[j]].concat(Y)); }
                }

                V=distand(Res1,or);
                if(V.length>1){
                    Res1= [[or].concat( V )];
                } else if(V.length==1){ Res1=V; }
            }
            if(Res1.length>1){
                if(curop==and){ Res= Res.concat(Res1); } 
                else { Res.push([and].concat(Res1)); }
            } else if(Res1.length==1){Res=Res.concat(Res1); 
            } else if(curop==and){ Res=[]; }
            
            //console.log("Res to return: ");
            //console.log(Res);
        
        } else { throw "illegal term type  in formula: " + L[i]; }
    }

    return Res;
}

// recursively look for "not" in a formula, and distribute "not" over "and" or "or"
// expects a single Formula, but can handle singular nesting of the formula
// returns Formulas unchanged if not distribution is possible.
function distnot(F){
    if(type(F) != "Array"){return F; }
    if(F.length==1 && type(F[0])=="Array"){ return distnot(F[0]); }
    var Res = [];
    if(F[0] == not){ 
        if( type(F[1]) == "Array" && F[1].length >2 && (F[1][0]==or || F[1][0] == and) ){  
            Res = F[1][0]==or ? [and] : [or];   
            for(var i=1; i<F[1].length; ++i){
                Res.push(distnot([not,F[1][i]]));
            }
        } else if( type(F[1]) == "Array" && F[1].length == 2 & F[1][0] == not){
            Res = F[1][1];
        } else {
            Res = F;
        }
    } else if(F[0]==or || F[0]==and){
        var Res1=[F[0]];
        for( i=1; i<F.length; ++i){
            Res1.push(distnot(F[i]));
        }
        Res= Res.concat(Res1);
    } else {
        Res = F;
    }
    return Res;
}


// move all non-or clauses to the end 
// assumes that F is Array of propositions
function orsfirst(F){
    var Ors = [];
    var Rest = [];

    for(var i=0; i<F.length; ++i){
        if( F[i]!=null && F[i][0]==or ){ Ors.push(F[i]); }
        else { Rest.push(F[i]); }
    }
    return {"ors":Ors,"rest":Rest};
}

// NOTE: lookup needs to be able to look up negs of variables [not,'X']
// lookup value of a variable, or of a conditional
function lookup(F,Net,val=true){
    if(type(Net) != "Object"){ return false; }
    var res = false;

    if(type(F)=="String" && (F in Net)){
        if(val in Net[F]){ res = Net[F][val]; }
        else if( val==false && val!=formulas && true in Net[F]){ res = 1 - Net[F][true]; }
        else if( (val==true || val=="logic") && !(val in Net[F]) && formulas in Net[F] ){
            //console.log("lookin for formulas...");
            if(formulas in Net[F]){
                res = [];
                for(var i=0; i<Net[F][formulas].length; ++i){
                    res.push([given,F,Net[F][formulas][i][1]]);
                }
                res = res.length>1? [or].concat(res) : res[0];
            } else {
                res = [or,F,[not,F]];
            }
        }
    } else if(type(F) == "Array" && F.length > 2 && F[0] == given){
        if( F[1] in Net && formulas in Net[F[1]]){
            for(var f=0; f<Net[F[1]][formulas].length; ++f){
                if(equals(Net[F[1]][formulas][f][1],F[2])){
                    res = Net[F[1]][formulas][f][0];
                    break;
                }
            }
        }
    }
    return res;
}

// get all max sized combinations of a list of junctions and switch functors 
// e.g combos([and,[or,A,B],[or,C,D],[or,E,F]]) => [or,[and,A,C,E],[and,A,C,F],[and,A,D,E],[and,A,D,F],[and,B,C,E],[and,B,C,F],[and,B,D,E],[and,B,D,F]]
function combos(List){
    if(type(List)=="Array"){
        if(List.length==1){
            if([and,or].includes(typet(List[0]))){ return combos(List[0]); }
            else { return List; }
        }
    }
    var Res = List;
    if([and,or].includes(List[0]) && List.length > 2 && [and,or].includes(typet(List[1])) &&  List[1].length > 1){
        Res = [ List[0]==or ? and : or ];
        var op = List[0];
        var C = combos0(List.slice(2));
        for(var i=1; i<List[1].length; ++i){
            for(var j=0; j<C.length; ++j){
                if([given,not,divide].includes(typet(C[j]))){
                    Res.push( [op,List[1][i],C[j]] );
                } else {
                    Res.push( [op,List[1][i]].concat(C[j]) ) ;
                }
            }
        }
    }
    return Res;
}

function combos0(List){
    if(type(List)!="Array" || typet(List[0])=="Undefined"){ return List; }
    if(List.length==1 && [and,or].includes(typet(List[0]))){ return List[0].slice(1); }

    var Res = [];
    var C = combos0(List.slice(1));
    var j= 0;

    if(type(List[0])!="Array" || [given,not,divide].includes(typet(List[0]))){ // exception terms
        for(j=0; j<C.length; ++j){
            if([given,not,divide].includes(typet(C[j]))){
                Res.push( [List[0],C[j]]);
            } else {
                Res.push( [List[0]].concat( C[j] ));
            }
        }        
    } else {  // this is the real core: how to recursively combine
        for(var i=1; i<List[0].length; ++i){
            for(j=0; j<C.length; ++j){
                if([given,not,divide].includes(typet(C[j]))){
                    Res.push( [List[0][i],C[j]]);
                } else {
                    Res.push( [List[0][i]].concat( C[j] ));
                }
            }
        }
    }
    return Res;
}

// check if an array has a particular value
// parameter "cond" controls if conditional terms need to be searched
// in general, for disjunctive lists, don't search the conditionals, but
// for conjunctive lists, do.
// expects a NNF list of terms,  NOT A FORMULA, because it needs to examine the term type
// to decide how to handle the search.
function has(X,V,cond=false){
    var T=null;
    var h=null;
    if( type(X) != "Array"){ return false; }
    //console.log("\ndoes the following list have ( "+V+" ) if tail consideration is "+cond);
    //console.log(X);
    for(var i=0; i<X.length; ++i){
        T = typet(X[i]);
        //console.log("...typet of term "+i+" is "+T);
        //console.log("check if term ( "+X[i]+" ) equals ( "+V+" )");
        if( equals(X[i],V)){
            //console.log("...found an equal term for ("+V+" )"); 
            return {pos:i,type:null}; 
        } else if(T==or || T==and ){
            //console.log("...not equal. Checking inside an 'or','and' term");
            h=has(X[i].slice(1),V,cond);
            if(h){ 
                //console.log("...back from and/or subterm: success, it was in there");
                return {pos:i,type:h.type}; 
            }
            //console.log("...back from and/or subterm: not in there.");
        } else if( cond && (T==given || T==divide || (T==not && (typet(X[i][1])==given || typet(X[i][1])==divide)) )){
            //console.log("...checking inside a given,divide or [not,given/divide] term");
            var Given = T==not? X[i][1] : X[i];
            //console.log("...the Given term: "+Given);
            T = typet(Given);
            var Depvartail = (T==given || T==divide) ? [Given[1],Given[2]] : [Given[1][1],Given[1][2]];
            var Depvar = Depvartail[0];
            var Tail = Depvartail[1];
            //console.log("...compare search term ("+V+") against the dependent Var: "+Depvar);
            if(equals(Depvar,V)){ return {pos:i,type:null}; }
            else{
                //console.log("...Not equal to dep var. Look in given/divide tail: "+Tail);
                //tail = dnf(tail[1])[0];
                //console.log("   ...dnf of tail is: "+tail);
                if(Tail[0]==and || Tail[0]==or){
                    //console.log("   ...tail is and/or. Do tail terms ("+Tail.slice(1)+") contain search term ("+V+") ?");
                    if(has(Tail.slice(1),V,cond)){ return {pos:i,type:Tail[0]}; }    
                } else {
                    //console.log("   ...tail is not and/or. Is it equal to search term ("+V+")?");
                    //if(equals(Tail,dnf(V)[0])){ return {pos:i,type:null}; }
                    if(equals(Tail,V)){ return {pos:i,type:null}; }
                }
            }
        }
    }
    return false;
}


// compare two lists, unordered except for [0] or "given", or objects recursively down to strings or numbers
function equals(X,Y){
    //console.log("     *** comparing ( "+X+" ) with ( "+Y+" )");
    //console.log("\n\nComparing the following: ");
    //console.log(X);
    //console.log("----- with ----");
    //console.log(Y);
    //console.log("---------------");
    var len=0;          // temp var for length
    var typeX = type(X);
    var A = [];
    var B = [];
    //console.log("   compare types...");
    if(typeX != type(Y)){ return false; }
    if(typeX == "String" || typeX == "Number"){
        //console.log("   strings..");
        return X==Y;
    } else if (typeX == "Array"){
        len = X.length;
        if(len != Y.length){ return false; }

        //console.log("   zero length...");        
        if(len < 1){ return true; }

        //console.log("   element 0..."); 
        // The first element is a special case, because it's positionally bound
        if(len==1){ return equals(X[0],Y[0]); }
        if(!equals(X[0],Y[0])){ return false; }

        // If the first element was "given" or "divide", then the second
        // element is also positionally bound
        if(X[0]==given || X[0]==divide){
            if(!equals(X[1],Y[1])){ return false; }
            A = type(X[2])=="Array"? X[2]: [X[2]];
            B = type(Y[2])=="Array"? Y[2]: [Y[2]];
            len = A.length;
            if(len != B.length){return false; }
        } else {
            A = X.slice(1);
            B = Y.slice(1);
            len = A.length;
        }
        //console.log("   ...remaining elements...");
        for(var i=0; i<len; ++i){
            if( !has(A,B[i]) ){ return false; }
        }
        //console.log("   ............");                
        return true;
    } else if(typeX == "Object"){
        len = Object.keys(X).length;
        if(len != Object.keys(Y).length){ return false; }
        for(var k in X){
            if(!(k in Y) || !equals(X[k],Y[k])){ return false; }
        }
        return true;
    } else { return false; }
}

// determine term type in formula
function typet(T){
    var Termtype = type(T);
    var Vardef = /^[A-Z]/;     // variables have to start with a uppercase letter
    if( type(T) == "Array" && T.length > 0) { Termtype = T[0]; }
    else if( type(T) == "String" && T.length > 0){
        var C = T[0];
        if( Vardef.test(C) ){ Termtype = "Variable"; }
    }
    return Termtype;
}

// genertic js type function
function type(X){ return Object.prototype.toString.call(X).slice(8,-1); }


// PROBABILITY CALCULATION SECTION

// process a DNF formula and calculate the probability
// expects a formula and a completed probability network
function prob(Formula,Net){
    var F=dnf(Formula);
    if([and,not,"Variable"].includes(typet(F))){
        return jprobs([or,F],Net);
    } else if(typet(F)==divide){
        if(F[1].length==0 && F[2].length==0){ return 1; }
        else{
            var X = prob(F[1],Net);
            var Y = prob(F[2],Net);
            return X/Y;
        }
    } else if(typet(F)==or){
        return jprobs(F,Net);
    } else throw "no DNF formula: can not calculate probability";
}

// calculate the probabilities of a (disjunctive) list of conjunctions. Expects a disjunctive (DNF) 
// formula of only conjunctions or simple terms (i.e. no divides), and a probability network
function jprobs(F,Net){
    if(type(Net)!="Object") throw "no probability network";
    var Varlist = Net.vars;
    if(type(Varlist)=="Undefined") throw "no variables given in the probability network "+Net.id;
    if([and,not].includes(typet(F))){ F = [F]; }
    else if(typet(F)==or){ F=F.slice(1); }
    else throw "formula not DNF";
    var B= new BitArray(Math.pow(2,Net.vars.length));

    var L=[];
    var X=null;
    var P=null;
    //var Ps=[];
    var Ps=0;
    for(var i=0; i<F.length; ++i){
        L = allvars( typet(F[i][0])=="Variable" || typet(F[i])==not ? F[i]: F[i].slice(1) ,Varlist);
        //L = allvars( typet(F[i][0])=="Variable"? F[i]: F[i].slice(1) ,Varlist);
        for(var j=0; j<L.length; ++j){
            X=vars2x(L[j],Varlist);
            if(!B.getbit(X)){
                B.setbit(X);
                P=product(jprob(L[j],Net));
                //Ps.push(P);       // for debugging: see the list of probabilities
                Ps += P;
            }
        }
    }
    B=null; // release memory
    return Ps;
}

// lookup the joint probability of a conjunction of atomic terms (i.e. Var or negation of Var)
function jprob(Vars, Net){
    if(type(Net)!="Object") throw "no probability network";
    if(type(Vars)!="Array"){ return jprob([Vars],Net); }
    var Ps=[];
    var P=null;
    var X=null, Y=null;
    var Vs=[];
    var Varlist = Net.vars;
    var neg = false;
    var V=null;
    if(type(Varlist)=="Undefined") throw "no variables listed in probability network "+Net;
    for(var i=0; i<Vars.length; ++i){
        neg=false;
        if(typet(Vars[i])==not){
            neg=true;
            V=Vars[i][1];
        } else { V=Vars[i]; }
        if(typet(V)=="Variable"){
            P = lookup(V,Net);
            if(!P) throw "unknown variable in formula: "+V;
            if(type(P)=="Number"){ Ps.push( neg? 1-P : P); }
            else{
                Vs=Net[V].vars;
                if(type(Vs)=="Undefined") throw "probability network incomplete in variable "+ Vars[i];
                X = v2x(Vars);
                Y = x2x(X,Vs,Varlist);
                P = Net[V].probs[Y];
                if(type(P)=="Undefined") throw "probability undefined for "+Vars[i];
                Ps.push( neg? 1-P : P);
            }
        } else throw "term should only have variables or their negations";
    }
    return Ps;
}

// expand a variable combination in a formula to include all combinations when
// some possible variables are missing. Expects L to be a conjunction of variables
// or their negations.  Returns a list of expansions
function allvars(L,Vars){
    var F = typet(L)=="Variable" || typet(L)==not? [L] : L;
    var Missing =[];
    var Res = [];
    var Vs = getvars(F);
    for(var i=0; i<Vars.length; ++i){ 
        if(!(Vs.includes(Vars[i]))){ Missing.push(Vars[i]); }
    }
    Missing = bcombos(Missing);
    for(i=0;i<Missing.length;++i){
        Res.push(F.concat(Missing[i]));
    }
    return Res;
}

// extract all variables from a formula
// expects a list
function getvars(L){
    var Res = {};  // used to avoid duplicates
    var Vs=getvars0(L,Res);
    Res =null;
    return Vs;
}
function getvars0(L,Res){
    if(typet(L)=="Variable"){return [L]; }
    if(type(L)!="Array"){return []; }
    var Vs = [];
    for(var i=0;i<L.length;++i){
        if(typet(L[i])=="Variable"){
            Res[L[i]]=null;
        } else if([not,and,or].includes(typet(L[i]))){
            Vs = getvars0(L[i],Res);
            for(var j=0;j<Vs.length;++j){ Res[Vs[j]]=null; }
        } else if(typet(L[i])==given){
            Res[L[i][1]]=null;
            Vs = getvars0(L[i][2],Res);
            for(j=0;j<Vs.length;++j){ Res[Vs[j]]=null; }
        } else if(typet(L[i])==divide){
            Vs = getvars0(L[i][1],Res);
            for(j=0;j<Vs.length;++j){ Res[Vs[j]]=null; }
            Vs = getvars0(L[i][2],Res);
            for(j=0;j<Vs.length;++j){ Res[Vs[j]]=null; }
        } else if(type(L[i])=="Array"){
            Vs = Vs.concat( getvars0(L[i],Res));
        }
    }
    return Object.keys(Res).sort();
}

// all positive and negative combinations of a list of variables
// e.g. [X,Y] becomes [ [[not,X],[not,Y]], [[not,X],Y], [X,[not,Y]], [X,Y] ]
function bcombos(L){
    var Res=[];
    var C =[];
    for(var i=0, Len=Math.pow(2,L.length); i<Len; ++i){  // calc Len only once
        C=[];
        for(var j=0;j<L.length;++j){
            C.push(i & Math.pow(2,j)? L[j] : [not,L[j]]);
        }
        Res.push(C);
    }
    return Res;
}

// translate an index of a binary-count ordered list into 
// the boolean combination of variables.  For example,
// if the alphabetically sorted variable list is X,Y
// then [not,X],[not,Y] = 0, [not,X],Y = 1, X,[not,Y]=2 and X,Y=3
function x2v(X, Vs){
    var Varlist=Vs.sort();
    var Res=[and];
    var Y = X % Math.pow(2,Varlist.length);
    var maxbits = Varlist.length-1;
    for(var i=0; i<Varlist.length; ++i){
        Res.push(  Y & Math.pow(2,maxbits-i) ? Varlist[i] : [not,Varlist[i]] );
    }
    return Res.length<3? Res.length<2? [] : Res[1] : Res;
}

function x2vsub(X, Vs, Varlist){
    var Res=[and];
    var Y = X % Math.pow(2,Varlist.length);
    var maxbits = Varlist.length-1;
    for(var i=0; i<Varlist.length; ++i){
        if(Vs.indexOf(Varlist[i])>-1){
            Res.push(  Y & Math.pow(2,maxbits-i) ? Varlist[i] : [not,Varlist[i]] );
        }
    }
    return Res;
}

// convert a term list (i.e. list of variables or their negations) to 
// a binary count order index.
function v2x(Terms){
    var Vs = getvars(Terms);  // sorted list of variables
    return vars2x(Terms,Vs);
}

function vars2x(T,Vs){
    var Terms = typet(T)=="Variable" || typet(T)==not ? [T] : T;
    var Res = 0;
    var maxbits = Vs.length-1;
    for(var j=0; j<Terms.length; ++j){
        if(typet(Terms[j])=="Variable") {
            Res |= Math.pow(2,maxbits-Vs.indexOf(Terms[j])); 
        }
    }
    return Res;
}

// convert the variable combo index to an index
// of a smaller subset of variables
function x2x(X,Vs,Varlist){
    return v2x(x2vsub(X,Vs,Varlist));
}

// multiply probabilities in a list
// just in case some browser doesn't support ES6
function product(L){
    var Sum=0;
    for(var i=0; i<L.length; ++i){ Sum += Math.log(L[i]); }
    return Math.exp(Sum);
}

// small version of BitArrays
// object constructor for BitArray
function BitArray(totalbits) {
    this.className = "BitArray";
    this.cells = Math.ceil(totalbits / 8);
    this.bits = this.cells * 8;
    this.val = new Uint8Array(this.cells);
    const ipow = [128, 64, 32, 16, 8, 4, 2, 1]; // alt for Math.pow(2,7-i)
  
    // initialise buffer bits to zero
    this.zero = function () {
        for (var i = 0; i<this.cells; ++i) {
            this.val[i] = 0;
        }
        return 0;
    };
  
    // set a particular bit
    this.setbit = function (index) {
        var i = index / 8 >> 0; // index div 8
        if (index < this.bits && i <= this.cells) {
            this.val[i] = this.val[i] | ipow[index % 8];
            return (true);
        } else return (false);
    };
  
    // unset a particular bit
    this.unsetbit = function (index) {
        var i = index / 8 >> 0; // index div 8
        if (index < this.bits && i <= this.cells) {
            this.val[i] &= ~ipow[index % 8];
            return (true);
        } else return (false);
    };
  
    // get value of a particular bit
    this.getbit = function (index) {
        var i = index / 8 >> 0; // index div 8
        if (index < this.bits && i <= this.cells) {
            return ((this.val[i] & ipow[index % 8]) != 0);
        } else return (false);
    };
  
    // get indices for all the set bits
    this.getones = function(){
        var ret = [];
        for(var i=0; i<this.bits; ++i){
            if(this.getbit(i)) ret.push(i);
        }
        return ret;
    };

    // sum up number of bits that are set
    this.bitsum = function () {
        var sum = 0;
        for (var i = 0, len = this.cells; i < len; ++i) {
            var n = this.val[i];
            for (var b = 0, l = 8; b < l; ++b) {
                sum = sum + ((n & ipow[b]) != 0);
            }
        }
        return (sum);
    };

}  



if (typeof module !== "undefined" && typeof module.exports !== "undefined"){
    module.exports = {calcvars, highlight, resetcode, pcalc, tickconvert, sortfs, Dlist: () => Dlist};
}
