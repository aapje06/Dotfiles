var customStyleObj = {};
var presets = chrome.extension.getBackgroundPage().getPresets();

function save_options() {
  // get and save selected style
  var select = document.getElementById("css_set");
  var setName = select.children[select.selectedIndex].value;
  chrome.storage.local.set({"cssSet":setName});
  var cssObj = (setName=="customized") ? customStyleObj : presets[setName];
  chrome.storage.local.set({"cssCode":chrome.extension.getBackgroundPage().buildCSSCode(cssObj)});
  chrome.storage.local.set({"cssCustomStyleObj":cssObj});
  
  // reload open tabs
  chrome.extension.getBackgroundPage().updateAllTabs();
  
  // Update status to let user know options were saved.
  var status = document.getElementById("status");
  status.innerHTML = "Options Saved.";
  setTimeout(function() {
    status.innerHTML = "";
  }, 2000);
}

// Restores select box state to saved value from localStorage.
function restore_options() {
  
  chrome.storage.local.get("cssCustomStyleObj", function(o1) {
    // init select box with options from preset object
    var select = document.getElementById("css_set");
    for(i in presets)
    {
      var option = document.createElement("option");
      option.setAttribute("value",i);
      option.innerHTML = presets[i].name;
      select.appendChild(option);
    }
    
    chrome.storage.local.get("cssSet", function(o2) {
      if (o2.cssSet==undefined) {
        return;
      }
      
      // set obj for onStyleChanged event
      var currentObj = (o2.cssSet=="customized" && typeof o1.cssCustomStyleObj != "undefined") ? o1.cssCustomStyleObj : presets[o2.cssSet];
      customStyleObj = currentObj;
      
      // restore input values for selected css set
      setInputValues(currentObj);
      
      // set select box to css set
      var select = document.getElementById("css_set");
      for (var i = 0; i < select.children.length; i++) {
        var child = select.children[i];
        if (child.value == o2.cssSet) {
          child.selected = "true";
          break;
        }
      }
      
      
      var sbStyle = document.getElementById("sb_style");
      sbStyle.innerHTML = chrome.extension.getBackgroundPage().buildCSSCode(currentObj);
      redrawPreview();
    });
  });
}

function onSetChanged() {
  var select = document.getElementById("css_set");
  var setName = select.children[select.selectedIndex].value;
  
  setInputValues(presets[setName]);
  
  var sbStyle = document.getElementById("sb_style");
  sbStyle.innerHTML = chrome.extension.getBackgroundPage().buildCSSCode(presets[setName]);
  
  redrawPreview();
}

function setInputValues(cssSetObj)
{
  setScrollbarInput(cssSetObj);
  setScrollbarButtonInput(cssSetObj);
  setScrollbarTrackInput(cssSetObj);
  setScrollbarTrackPieceInput(cssSetObj);
  setScrollbarThumbInput(cssSetObj);
  setScrollbarCornerInput(cssSetObj);
  setResizerInput(cssSetObj);
}

function setScrollbarInput(cssSetObj) {
  if (typeof cssSetObj["style"]["::-webkit-scrollbar"] == "undefined" ||
      typeof cssSetObj["style"]["::-webkit-scrollbar"]["properties"] == "undefined")
    return false;
  // get vars
  var sbWidth = cssSetObj["style"]["::-webkit-scrollbar"]["properties"]["width"];
  var sbHeight = cssSetObj["style"]["::-webkit-scrollbar"]["properties"]["height"];
  var bgColor = cssSetObj["style"]["::-webkit-scrollbar"]["properties"]["background-color"];
  // set vars
  $("#sb_bgc").spectrum({
    color: (typeof bgColor != "undefined") ? bgColor : "#ffffff",
    change: function(color) {
      //$("#basic-log").text("change called: " + color.toHexString());
    }
  });
  
  var width = (typeof sbWidth != "undefined") ? sbWidth.replace("px","") : 15;
  $("#sb_width").val(width);
  var height = (typeof sbHeight != "undefined") ? sbHeight.replace("px","") : 15;
  $("#sb_height").val(height);
}

function setScrollbarButtonInput(cssSetObj) {
  if (typeof cssSetObj["style"]["::-webkit-scrollbar-button"] == "undefined" ||
      typeof cssSetObj["style"]["::-webkit-scrollbar-button"]["properties"] == "undefined")
    return false;
  // get vars
  var sbbWidth = cssSetObj["style"]["::-webkit-scrollbar-button"]["properties"]["width"];
  var sbbHeight = cssSetObj["style"]["::-webkit-scrollbar-button"]["properties"]["height"];
  var sbbRounded = cssSetObj["style"]["::-webkit-scrollbar-button"]["properties"]["-webkit-border-radius"];
  var bgColor = cssSetObj["style"]["::-webkit-scrollbar-button"]["properties"]["background"];
  // set vars
  $("#sbb_bgc").spectrum({
    color: (typeof bgColor != "undefined") ? bgColor : "#ffffff",
    change: function(color) {
      //$("#basic-log").text("change called: " + color.toHexString());
    }
  });
  var width = (typeof sbbWidth != "undefined") ? sbbWidth.replace("px","") : 0;
  $("#sbb_width").val(width);
  var height = (typeof sbbHeight != "undefined") ? sbbHeight.replace("px","") : 0;
  $("#sbb_height").val(height);
  var rounded = (typeof sbbRounded != "undefined") ? sbbRounded.replace("px","") : 0;
  $("#sbb_rounded").val(rounded);
}

function setScrollbarThumbInput(cssSetObj) {
  if (typeof cssSetObj["style"]["::-webkit-scrollbar-thumb"] == "undefined" ||
      typeof cssSetObj["style"]["::-webkit-scrollbar-thumb"]["properties"] == "undefined")
    return false;
  
  var sbtRounded = cssSetObj["style"]["::-webkit-scrollbar-thumb"]["properties"]["border-radius"];
  var rounded = (typeof sbtRounded != "undefined") ? sbtRounded.replace("px","") : 0;
  $("#sbt_rounded").val(rounded);
  // color
  var sbt_bgc1 = "#000000";
  if (typeof cssSetObj["style"]["::-webkit-scrollbar-thumb"]["infoData"] != "undefined" &&
      typeof cssSetObj["style"]["::-webkit-scrollbar-thumb"]["infoData"]["bgc1"] != "undefined")
    var sbt_bgc1 = cssSetObj["style"]["::-webkit-scrollbar-thumb"]["infoData"]["bgc1"];
  $("#sbt_bgc1").spectrum({
    color: sbt_bgc1,
    change: function(color) {
    }
  });
  var sbt_bgc2 = "#000000";
  if (typeof cssSetObj["style"]["::-webkit-scrollbar-thumb"]["infoData"] != "undefined" &&
      typeof cssSetObj["style"]["::-webkit-scrollbar-thumb"]["infoData"]["bgc2"] != "undefined")
    var sbt_bgc2 = cssSetObj["style"]["::-webkit-scrollbar-thumb"]["infoData"]["bgc2"];
  $("#sbt_bgc2").spectrum({
    color: sbt_bgc2,
    change: function(color) {
    }
  });
  // style
  if (typeof cssSetObj["style"]["::-webkit-scrollbar-thumb"]["infoData"] != "undefined" &&
      typeof cssSetObj["style"]["::-webkit-scrollbar-thumb"]["infoData"]["bgcStyle"] != "undefined")
  {
    switch(cssSetObj["style"]["::-webkit-scrollbar-thumb"]["infoData"]["bgcStyle"])
    {
      case "clean":
        $("input[type=radio][value=clean]").first().attr("checked","checked");
        $("#sbt_bgc1_box").show();
        $("#sbt_bgc2_box").hide();
        break;
      case "linear":
        $("input[type=radio][value=linear]").first().attr("checked","checked");
        $("#sbt_bgc1_box").show();
        $("#sbt_bgc2_box").show();
        break;
      case "radial":
        $("input[type=radio][value=radial]").first().attr("checked","checked");
        $("#sbt_bgc1_box").show();
        $("#sbt_bgc2_box").show();
        break;
      default:
        $("input[type=radio][value=clean]").first().attr("checked","checked");
        $("#sbt_bgc1_box").show();
        $("#sbt_bgc2_box").hide();
        break;
    }
  }
}

function setScrollbarTrackInput(cssSetObj) {
  if (typeof cssSetObj["style"]["::-webkit-scrollbar-track"] == "undefined")
    return false;
}

function setScrollbarTrackPieceInput(cssSetObj) {
  if (typeof cssSetObj["style"]["::-webkit-scrollbar-track-piece"] == "undefined")
    return false;
}

function setScrollbarCornerInput(cssSetObj) {
  if (typeof cssSetObj["style"]["::-webkit-scrollbar-corner"] == "undefined")
    return false;
}

function setResizerInput(cssSetObj) {
  if (typeof cssSetObj["style"]["::-webkit-resizer"] == "undefined")
    return false;
}

function onStyleChanged(event)
{
  // if style customized, set select box to customized text
  var select = document.getElementById("css_set");
  var child = select.children[0];
  child.selected = "true";
  
  //> SB Scrollbar
  var sbBGColor = $("#sb_bgc").spectrum("get").toHexString();
  var sbWidth = $("#sb_width").val();
  var sbHeight = $("#sb_height").val();
  
  customStyleObj["style"]["::-webkit-scrollbar"]["properties"]["background-color"] = sbBGColor;
  if (sbWidth && sbWidth!="" && isFinite(sbWidth))
    customStyleObj["style"]["::-webkit-scrollbar"]["properties"]["width"] = sbWidth+"px";
  if (sbHeight && sbHeight!="" && isFinite(sbHeight))
    customStyleObj["style"]["::-webkit-scrollbar"]["properties"]["height"] = sbHeight+"px";
  //< SB Scrollbar
  //> SB ScrollbarButton
  var sbbBGColor = $("#sbb_bgc").spectrum("get").toHexString();
  var sbbWidth = $("#sbb_width").val();
  var sbbHeight = $("#sbb_height").val();
  var sbbRounded = $("#sbb_rounded").val();
  
  customStyleObj["style"]["::-webkit-scrollbar-button"]["properties"]["background-color"] = sbbBGColor;
  if (sbbWidth && sbbWidth!="" && isFinite(sbbWidth))
    customStyleObj["style"]["::-webkit-scrollbar-button"]["properties"]["width"] = sbbWidth+"px";
  if (sbbHeight && sbbHeight!="" && isFinite(sbbHeight))
    customStyleObj["style"]["::-webkit-scrollbar-button"]["properties"]["height"] = sbbHeight+"px";
  if (sbbRounded && sbbRounded!="" && isFinite(sbbRounded))
    customStyleObj["style"]["::-webkit-scrollbar-button"]["properties"]["-webkit-border-radius"] = sbbRounded+"px";
  //< SB ScrollbarButton
  //> SB Thumb
  var sbtBGColor1 = $("#sbt_bgc1").spectrum("get").toHexString();
  var sbtBGColor2 = $("#sbt_bgc2").spectrum("get").toHexString();
  var sbtRounded = $("#sbt_rounded").val();
  var sbtStyle = $("input[type=radio][name=sbt_color_style]:checked").first().val();
  
  customStyleObj["style"]["::-webkit-scrollbar-thumb"]["infoData"]["bgc1"] = sbtBGColor1;
  customStyleObj["style"]["::-webkit-scrollbar-thumb"]["infoData"]["bgc2"] = sbtBGColor2;
  customStyleObj["style"]["::-webkit-scrollbar-thumb"]["infoData"]["bgcStyle"] = sbtStyle;
  
  switch(sbtStyle)
  {
    case "clean":
      customStyleObj["style"]["::-webkit-scrollbar-thumb"]["properties"]["background"] = sbtBGColor1;
      $("input[type=radio][value=clean]").first().attr("checked","checked");
      $("#sbt_bgc1_box").show();
      $("#sbt_bgc2_box").hide();
      break;
    case "linear":
      customStyleObj["style"]["::-webkit-scrollbar-thumb"]["properties"]["background"] = "-webkit-linear-gradient("+sbtBGColor1+","+sbtBGColor2+")";
      $("input[type=radio][value=linear]").first().attr("checked","checked");
      $("#sbt_bgc1_box").show();
      $("#sbt_bgc2_box").show();
      break;
    case "radial":
      customStyleObj["style"]["::-webkit-scrollbar-thumb"]["properties"]["background"] = "-webkit-radial-gradient("+sbtBGColor1+","+sbtBGColor2+")";
      $("input[type=radio][value=radial]").first().attr("checked","checked");
      $("#sbt_bgc1_box").show();
      $("#sbt_bgc2_box").show();
      break;
    default:
      customStyleObj["style"]["::-webkit-scrollbar-thumb"]["properties"]["background"] = sbtBGColor1;
      $("input[type=radio][value=clean]").first().attr("checked","checked");
      $("#sbt_bgc1_box").show();
      $("#sbt_bgc2_box").hide();
      break;
  }
  
  if (sbtRounded && sbtRounded!="" && isFinite(sbtRounded))
    customStyleObj["style"]["::-webkit-scrollbar-thumb"]["properties"]["border-radius"] = sbtRounded+"px";
  //< SB Thumb
  //> SB Track
  
  //< SB Track
  
  var sbStyle = document.getElementById("sb_style");
  sbStyle.innerHTML = chrome.extension.getBackgroundPage().buildCSSCode(customStyleObj);
  
  redrawPreview();
}

function redrawPreview()
{
  sel = document.getElementById('sbp_active');
  sel.style.display='none';
  sel.offsetHeight; // no need to store this anywhere, the reference is enough
  sel.style.display='block';
  sel = document.getElementById('sbp_inactive');
  sel.style.display='none';
  sel.offsetHeight; // no need to store this anywhere, the reference is enough
  sel.style.display='block';
}

document.addEventListener('DOMContentLoaded', restore_options);
document.querySelector('#save').addEventListener('click', save_options);
document.getElementById('css_set').addEventListener("change", onSetChanged);
$("#customize_button").click(function(event) {
  event.preventDefault();
  $("#customize").toggle(200);
})
$(".sbt_color_style").change(function(){
  switch(this.value)
  {
    case "clean":
      $("#sbt_bgc1_box").show();
      $("#sbt_bgc2_box").hide();
      break;
    case "linear":
      $("#sbt_bgc1_box").show();
      $("#sbt_bgc2_box").show();
      break;
    case "gradient":
      $("#sbt_bgc1_box").show();
      $("#sbt_bgc2_box").show();
      break;
    default:
      $("#sbt_bgc1_box").show();
      $("#sbt_bgc2_box").hide();
      break;
  }
});
for(i in document.getElementsByClassName("chgupd"))
{
  document.getElementsByClassName("chgupd")[i].onchange = onStyleChanged;
}
