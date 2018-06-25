// print.js  -- useful print utility for arrays and objects
const util = require("util");

// helper functions to pretty print hierarchical content

function print(X,g=6,s=3,i=true){
    if(i) {console.log(concat(X,g,s));}
    else { return util.inspect(X,false,null); }
    return true;
}

function concat(X,g=6,s=3, indent=""){
    var Res = "";
    if(Object.prototype.toString.call(X).slice(8,-1)=="Array"){
        Res += ((indent.length < g) ? "\n"+indent : (indent.length % s==0? " ": "" ) ) + "[";
        for(var i=0;i<X.length-1;++i){
            Res += concat(X[i],g,s,indent+"  ")+",";
        }
        Res += concat(X[i],g,s,indent+"  ")+(indent.length< (g-2) ? "\n"+indent : (indent.length % s==0? " ": "" ) )+"]";
    } else {
        Res += util.inspect(X,false,null);
    }
    return Res;
}

if (typeof module !== "undefined" && typeof module.exports !== "undefined"){
    module.exports = {print, concat};
}

