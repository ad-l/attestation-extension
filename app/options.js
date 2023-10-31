var $ = require('jquery');

async function restoreOptions(){
  $("#websites").empty().append($("<option>(new website)</option>"));
  chrome.storage.sync.get(null, items => {
    for(var i in items) {
        let option = $("<option></option>").val(i).text(i);
        $("#websites").append(option);
    }
  });
}

function loadConfig(e) {
    const o = $("#websites").val();
    if(!o) return;
    chrome.storage.sync.get([o], x => {
        var i; for(i in x);
        x = x[i];
        $("#origin").val(x.origin);
        $("#cpu_jwks").val(x.cpu_jwks);
        $("#cpu_policy").val(x.cpu_policy);
        $("#gpu_jwks").val(x.gpu_jwks);
        $("#gpu_policy").val(x.gpu_policy);
    });
    return false;
}

function addConfig(e) {
    let ws = {
      origin: $("#origin").val(),
      cpu_jwks: $("#cpu_jwks").val(),
      cpu_policy: $("#cpu_policy").val(),
      gpu_jwks: $("#gpu_jwks").val(),
      gpu_policy: $("#gpu_policy").val()
    };
    let upd = {}; upd[ws.origin] = ws;
    chrome.storage.sync.set(upd, () => {
      $("#form").trigger("reset");
      restoreOptions();
    });
    return false;
  }
  
document.addEventListener('DOMContentLoaded', restoreOptions);

$("#remove").on('click', async e => {
    let i = $("#websites").val();
    if(!i) return;
    if(confirm("Delete trusted website "+i+"?")) {
      chrome.storage.sync.remove([i], x=>{});
      $("#form").trigger("reset");
      restoreOptions();
    }
});

$("#save").on('click', addConfig);
$("#load").on('click', loadConfig);