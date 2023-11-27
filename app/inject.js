document.cookie = "__attestation_extension__=True;max-age=1";

window.addEventListener("message", function(e) {
    if(e.origin != self.origin) return;
    console.log("Content script event: "+e.data)
    if(e.data == "__attestation_init")
    {
      chrome.runtime.sendMessage({init: e.origin}, tokens => {
        console.dir(tokens);
        if(!tokens || typeof tokens != "object") return;
        let div = document.getElementById("extwarn");
        div.style.display = "block";
        div.style.height = "45px";
        if(tokens.site_trusted)
        {
          if(tokens.cpu_trusted & tokens.gpu_trusted && tokens.cpu_policy_pass && tokens.gpu_policy_pass) {
            div.style.width = "470px";
            div.style.background = "#dfd";
            div.style.border = "1px solid #003";
            div.style.color = "#030";
            div.innerHTML = `Attestation succeeded, data is protected end to end. Click <span id="__attest_icon" style="display:inline-block;width:18px;height:18px;"></span> for details.`
            document.getElementById("__attest_icon").innerHTML = '<img src="'+chrome.runtime.getURL("icons/attested.png")+'" width="16" height="16" style="vertical-align:middle;" />';  
          } else {
            div.innerHTML = `<b>Warning: attestation failed</b>. Click <span id="__attest_icon" style="display:inline-block;width:18px;height:18px;"></span> for details.`
            document.getElementById("__attest_icon").innerHTML = '<img src="'+chrome.runtime.getURL("icons/danger.png")+'" width="16" height="16" style="vertical-align:middle;" />';  
          }
        }
        else 
        {
          div.style.background = "#ffd9c3";
          div.innerHTML = `This website is attested but no trust policy is set. Click <span id="__attest_icon" style="display:inline-block;width:18px;height:18px;"></span> to configure.`
          document.getElementById("__attest_icon").innerHTML = '<img src="'+chrome.runtime.getURL("icons/action.png")+'" width="16" height="16" style="vertical-align:middle;" />';
        }
      });
    }
});
