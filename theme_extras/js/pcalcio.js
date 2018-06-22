// CKEDITOR interface for pcalc.js
// assumes that ckeditor and pcalc.js are loaded by the webpage
function activate_ckeditor(edname,buttonname){
    var editor=CKEDITOR.replace( edname,{
        height:250,
        allowedContent: true,
        extraPlugins: "notification",
        on:{
            focus:  function(event){
                var button = document.getElementById("CalcButton");
                editor.setData(resetcode((editor.getData())));
                button.value="Calculate";
            }
        },
        toolbarGroups : [
            { name: "document", groups: [ "mode", "document", "doctools" ] },
            { name: "clipboard", groups: [ "clipboard", "undo" ] },
            { name: "editing", groups: [ "find", "selection", "spellchecker", "editing" ] },
            { name: "links", groups: [ "links" ] },
            { name: "insert", groups: [ "insert" ] },
            { name: "colors", groups: [ "colors" ] },
            "/",
            { name: "styles", groups: [ "styles" ] },
            { name: "basicstyles", groups: [ "basicstyles", "cleanup" ] },
            { name: "paragraph", groups: [ "list", "indent", "blocks", "align", "bidi", "paragraph" ] },
            { name: "tools", groups: [ "tools" ] },
            { name: "others", groups: [ "others" ] },
            { name: "about", groups: [ "about" ] },
            { name: "forms", groups: [ "forms" ] }
        ],
        removeButtons : "Source,Save,NewPage,Preview,Print,Templates,Cut,Copy,Paste,PasteText,PasteFromWord,Undo,Redo,Find,Replace,SelectAll,Scayt,Form,Checkbox,Radio,TextField,Textarea,Select,Button,ImageButton,HiddenField,CopyFormatting,RemoveFormat,Blockquote,CreateDiv,BidiLtr,BidiRtl,Language,Link,Unlink,Anchor,Image,Flash,Table,HorizontalRule,Smiley,SpecialChar,PageBreak,Iframe,TextColor,BGColor,Maximize,ShowBlocks,About"
    });
	
    let button = document.getElementById(buttonname);
    button.addEventListener("click", ()=>{
        if(button.value=="Calculate"){
            setTimeout(function(){
                editor.setData(highlight(calcvars(editor.getData())));
                button.value="Reset";
            },10);
        } else {
            editor.setData(resetcode((editor.getData())));
            button.value="Calculate";    
        }
    });
}